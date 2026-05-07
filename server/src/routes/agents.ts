import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import Ably from 'ably';
import { getDemoAgentById, incrementDemoAgentStats, listDemoAgents, upsertDemoAgent, deactivateDemoAgent } from '../services/demo-agents';
import { publish } from '../services/qstash';
import { TOPICS, type MarketplaceActivityEvent } from '@valdyum/shared';

const router: Router = Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseWriteKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function isMissingAgentsTableError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return message.includes("could not find the table 'public.agents'")
    || message.includes('relation "public.agents" does not exist')
    || error.code === 'PGRST205'
    || error.code === '42P01';
}

function isMissingColumnError(
  error: { message?: string; code?: string } | null | undefined,
  column: string
): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (error.code === '42703' && message.includes(`column agents.${column}`.toLowerCase())) ||
         (error.code === 'PGRST204' && message.includes(`'${column}'`));
}

function getMissingColumnName(error: { message?: string } | null | undefined): string | null {
  if (!error?.message) return null;
  const match = error.message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] ?? null;
}

function getSupabase() {
  return createClient(supabaseUrl, supabaseWriteKey, {
    auth: { persistSession: false },
  });
}

const network = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || process.env.SOLANA_CLUSTER || 'testnet';
const facilitatorUrl = process.env.PAYAI_FACILITATOR_URL || 'https://facilitator.payai.network';

function explorerUrl(txHash: string): string {
  return `https://explorer.solana.com/tx/${txHash}?cluster=${network}`;
}

async function verifyPayment(
  txHash: string,
  ownerWallet: string,
  priceXlm: number,
  agentId: string,
  callerWallet?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { verifyPaymentTransaction } = await import('../services/stellar');
    const expectedMemoPrefix = `agent:${agentId}`.slice(0, 28);
    const result = await verifyPaymentTransaction(
      txHash,
      ownerWallet,
      priceXlm,
      expectedMemoPrefix,
      callerWallet
    );
    return result;
  } catch (err) {
    return {
      valid: false,
      error: `Payment verification exception: ${String(err)}`,
    };
  }
}

// GET /list
router.get('/list', async (req: Request, res: Response) => {
  try {
    const owner = req.query.owner as string;
    const model = req.query.model as string;
    const tag = req.query.tag as string;
    const limit = parseInt((req.query.limit as string) || '50');

    if (!supabaseUrl || !supabaseServiceKey) {
      res.json({
        agents: listDemoAgents({ owner: owner || undefined, model: model || undefined, tag: tag || undefined, limit }),
        storage_mode: 'demo_fallback',
      });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const buildQuery = (orderColumn?: 'created_at' | 'updated_at') => {
      let query = supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .limit(limit);

      if (owner) {
        query = query.eq('owner_wallet', owner);
      } else {
        query = query.in('visibility', ['public', 'forked']);
      }

      if (model) query = query.eq('model', model);
      if (tag) query = query.contains('tags', [tag]);
      if (orderColumn) query = query.order(orderColumn, { ascending: false });

      return query;
    };

    let { data, error } = await buildQuery('created_at');

    if (isMissingColumnError(error, 'created_at')) {
      ({ data, error } = await buildQuery('updated_at'));
    }

    if (isMissingColumnError(error, 'updated_at')) {
      ({ data, error } = await buildQuery());
    }

    if (error) {
      if (isMissingAgentsTableError(error)) {
        res.json({
          agents: listDemoAgents({ owner: owner || undefined, model: model || undefined, tag: tag || undefined, limit }),
          storage_mode: 'demo_fallback',
          warning: 'Supabase agents table missing. Apply supabase-schema.sql for DB mode.',
        });
        return;
      }
      console.error('Supabase list query error:', error);
      res.status(500).json({ error: 'Failed to fetch agents from database', agents: [] });
      return;
    }

    res.json({ agents: data || [] });
  } catch (err) {
    console.error('List agents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /create
router.post('/create', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const {
      owner_wallet,
      name,
      description,
      tags,
      model,
      system_prompt,
      tools,
      price_xlm,
      visibility,
    } = body;

    if (!owner_wallet || !name || !model || !system_prompt) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!['openai-gpt4o-mini', 'anthropic-claude-haiku'].includes(model)) {
      res.status(400).json({ error: 'Invalid model' });
      return;
    }

    if (parseFloat(price_xlm) < 0.01) {
      res.status(400).json({ error: 'Minimum price is 0.01 XLM' });
      return;
    }

    const keyMode = supabaseServiceKey ? 'service_role' : 'anon_fallback';

    const agentId = uuidv4();
    function generateApiKey(): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let key = 'af_';
      for (let i = 0; i < 40; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
      }
      return key;
    }
    const apiKey = generateApiKey();
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiEndpoint = `${origin}/api/agents/${agentId}/run`;

    const canUseSupabase = Boolean(supabaseUrl && supabaseWriteKey);

    if (!canUseSupabase) {
      upsertDemoAgent({
        id: agentId,
        owner_wallet,
        name,
        description,
        tags: tags || [],
        model,
        system_prompt,
        tools: tools || [],
        price_xlm: parseFloat(price_xlm) || 0.01,
        visibility: visibility || 'public',
        api_endpoint: apiEndpoint,
        api_key: apiKey,
      });
      res.json({
        id: agentId,
        api_key: apiKey,
        api_endpoint: apiEndpoint,
        message: 'Agent deployed (local demo mode – configure Supabase env vars to persist)',
        storage_mode: 'demo_fallback',
      });
      return;
    }

    const supabase = getSupabase();

    try {
      await supabase
        .from('users')
        .upsert({ wallet_address: owner_wallet }, { onConflict: 'wallet_address' });
    } catch (err) {
      console.debug('[create] User upsert skipped:', err);
    }

    const baseInsertPayload: Record<string, unknown> = {
      id: agentId,
      owner_wallet,
      name,
      description,
      tags: tags || [],
      model,
      system_prompt,
      tools: tools || [],
      price_xlm: parseFloat(price_xlm) || 0.01,
      visibility: visibility || 'public',
      api_endpoint: apiEndpoint,
      api_key: apiKey,
    };

    const insertPayload = { ...baseInsertPayload };
    let agentError: { message?: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const { error } = await supabase.from('agents').insert(insertPayload);
      if (!error) {
        agentError = null;
        break;
      }

      const missingColumn = getMissingColumnName(error);
      if (error.code === 'PGRST204' && missingColumn && missingColumn in insertPayload) {
        delete insertPayload[missingColumn];
        continue;
      }

      agentError = error;
      break;
    }

    if (agentError) {
      if (isMissingAgentsTableError(agentError)) {
        upsertDemoAgent({
          id: agentId,
          owner_wallet,
          name,
          description,
          tags: tags || [],
          model,
          system_prompt,
          tools: tools || [],
          price_xlm: parseFloat(price_xlm) || 0.01,
          visibility: visibility || 'public',
          api_endpoint: apiEndpoint,
          api_key: apiKey,
        });
        res.json({
          id: agentId,
          api_key: apiKey,
          api_endpoint: apiEndpoint,
          message: 'Agent deployed (demo fallback – run supabase-schema.sql in your Supabase SQL editor to persist agents)',
          storage_mode: 'demo_fallback',
          warning: 'Apply supabase-schema.sql to persist agents in database',
        });
        return;
      }

      console.error('Supabase agent insert error:', agentError);

      if (agentError.code === '42501') {
        res.status(500).json({
          error: 'Database permission denied – check SUPABASE_SERVICE_ROLE_KEY and that RLS is disabled on the agents table',
          details: agentError.message,
          key_mode: keyMode,
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to persist deployed agent',
        details: agentError.message,
        code: agentError.code,
        key_mode: keyMode,
      });
      return;
    }

    res.json({
      id: agentId,
      api_key: apiKey,
      api_endpoint: apiEndpoint,
      message: 'Agent deployed successfully',
    });
  } catch (err) {
    console.error('Create agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!supabaseUrl || !supabaseServiceKey) {
      const demo = getDemoAgentById(id);
      if (!demo) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      res.json({ ...demo, storage_mode: 'demo_fallback' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isMissingAgentsTableError(error)) {
        const demo = getDemoAgentById(id);
        if (!demo) {
          res.status(404).json({ error: 'Agent not found' });
          return;
        }
        res.json({ ...demo, storage_mode: 'demo_fallback' });
        return;
      }
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      console.error('Get agent query error:', error);
      res.status(500).json({ error: 'Failed to fetch agent from database' });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    let forkCount = 0;
    try {
      const { count } = await supabase
        .from('agent_forks')
        .select('*', { count: 'exact', head: true })
        .eq('original_agent_id', id);
      forkCount = count || 0;
    } catch {
      // Non-fatal
    }

    res.json({ ...data, fork_count: forkCount });
  } catch (err) {
    console.error('Get agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/fork
router.post('/:id/fork', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const ownerWallet = body.walletAddress || body.owner_wallet || req.header('X-Wallet-Address') || '';

    if (!ownerWallet) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    let agent = getDemoAgentById(id);
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.warn('Fork agent lookup error:', error);
      } else if (data) {
        agent = data as typeof agent;
      }
    }

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const forkedId = uuidv4();
    const forkedName = body.name || `${agent.name} (fork)`;
    const forkedAgent = {
      id: forkedId,
      owner_wallet: ownerWallet,
      name: forkedName,
      description: agent.description,
      tags: agent.tags,
      model: agent.model,
      system_prompt: agent.system_prompt,
      tools: agent.tools,
      price_xlm: agent.price_xlm,
      visibility: 'forked',
      forked_from: agent.id,
      api_endpoint: agent.api_endpoint,
      api_key: agent.api_key,
    };

    if (!supabaseUrl || !supabaseServiceKey) {
      const created = upsertDemoAgent(forkedAgent);
      res.json({ agent: created, mode: 'demo_fallback' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.from('agents').insert({
      ...forkedAgent,
      is_active: true,
      total_requests: 0,
      total_earned_xlm: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) {
      console.error('Fork agent error:', error);
      res.status(500).json({ error: 'Failed to fork agent' });
      return;
    }

    await supabase.from('agent_forks').insert({
      original_agent_id: agent.id,
      forked_agent_id: forkedId,
      forked_by_wallet: ownerWallet,
      created_at: new Date().toISOString(),
    }).catch(() => undefined);

    res.json({ agent: data });
  } catch (err) {
    console.error('Fork agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const ownerWallet = body.walletAddress || req.header('X-Wallet-Address') || '';

    if (!ownerWallet) {
      res.status(400).json({ error: 'walletAddress is required' });
      return;
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      const result = deactivateDemoAgent(id, ownerWallet);
      if (!result.ok) {
        if (result.reason === 'not_found') {
          res.status(404).json({ error: 'Agent not found' });
          return;
        }
        res.status(403).json({ error: 'Only owner can remove this agent' });
        return;
      }
      res.json({ ok: true, id, mode: 'demo_fallback' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: existing, error: getErr } = await supabase
      .from('agents')
      .select('id, owner_wallet, is_active')
      .eq('id', id)
      .single();

    if (getErr) {
      if (isMissingAgentsTableError(getErr)) {
        const result = deactivateDemoAgent(id, ownerWallet);
        if (!result.ok) {
          if (result.reason === 'not_found') {
            res.status(404).json({ error: 'Agent not found' });
            return;
          }
          res.status(403).json({ error: 'Only owner can remove this agent' });
          return;
        }
        res.json({ ok: true, id, mode: 'demo_fallback' });
        return;
      }
      if (getErr.code === 'PGRST116') {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      console.error('Delete agent lookup error:', getErr);
      res.status(500).json({ error: 'Failed to fetch agent' });
      return;
    }

    if (!existing) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    if (existing.owner_wallet !== ownerWallet) {
      res.status(403).json({ error: 'Only owner can remove this agent' });
      return;
    }

    if (!existing.is_active) {
      res.json({ ok: true, id, alreadyInactive: true });
      return;
    }

    const { error: updateErr } = await supabase
      .from('agents')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('owner_wallet', ownerWallet);

    if (updateErr) {
      console.error('Delete agent update error:', updateErr);
      res.status(500).json({ error: 'Failed to remove agent' });
      return;
    }

    res.json({ ok: true, id });
  } catch (err) {
    console.error('Delete agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/run
router.post('/:id/sandbox', async (req: Request, res: Response) => {
  const { id: agentId } = req.params;

  try {
    let agent;
    if (!supabaseUrl || !supabaseServiceKey) {
      agent = getDemoAgentById(agentId);
    } else {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase.from('agents').select('*').eq('id', agentId).single();
      agent = (error && isMissingAgentsTableError(error)) ? getDemoAgentById(agentId) : data;
    }

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!agent.is_active) {
      res.status(403).json({ error: 'Agent is not active' });
      return;
    }

    const body = req.body || {};
    const { input } = body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Missing input field' });
      return;
    }

    const isMarketplaceAgent = ['public', 'forked'].includes(String(agent.visibility || ''));
    const effectivePrompt = isMarketplaceAgent && body.customization?.prompt
      ? body.customization.prompt
      : agent.system_prompt;

    let output = 'Unknown model';
    if (agent.model === 'openai-gpt4o-mini') {
      if (!process.env.OPENAI_API_KEY) {
        output = '[Sandbox mode] OpenAI API key not configured.';
      } else {
        const { runOpenAIAgent } = await import('../services/openai');
        output = await runOpenAIAgent(effectivePrompt, input);
      }
    } else if (agent.model === 'anthropic-claude-haiku') {
      if (!process.env.ANTHROPIC_API_KEY) {
        output = '[Sandbox mode] Anthropic API key not configured.';
      } else {
        const { runAnthropicAgent } = await import('../services/anthropic');
        output = await runAnthropicAgent(effectivePrompt, input);
      }
    }

    res.json({
      ok: true,
      sandbox: true,
      agentId,
      model: agent.model,
      output,
    });
  } catch (err) {
    console.error('Sandbox agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/run', async (req: Request, res: Response) => {
  const { id: agentId } = req.params;
  const startTime = Date.now();

  try {
    let agent;
    if (!supabaseUrl || !supabaseServiceKey) {
      agent = getDemoAgentById(agentId);
    } else {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase.from('agents').select('*').eq('id', agentId).single();
      agent = (error && isMissingAgentsTableError(error)) ? getDemoAgentById(agentId) : data;
    }

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!agent.owner_wallet || typeof agent.owner_wallet !== 'string') {
      res.status(500).json({ error: 'Agent owner wallet is not configured' });
      return;
    }
    const priceXlm = Number(agent.price_xlm || 0);
    if (Number.isNaN(priceXlm) || priceXlm < 0) {
      res.status(500).json({ error: 'Agent pricing configuration is invalid' });
      return;
    }
    if (!agent.is_active) {
      res.status(403).json({ error: 'Agent is not active' });
      return;
    }

    const body = req.body || {};
    const { input } = body;

    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Missing input field' });
      return;
    }

    const paymentTxHash = req.header('X-Payment-Tx-Hash');
    const callerWallet = req.header('X-Payment-Wallet') || '';

    if (priceXlm > 0 && !paymentTxHash) {
      const requestNonce = Math.random().toString(36).slice(2, 10);
      const memo = `agent:${agentId}:req:${requestNonce}`.slice(0, 28);
      
      res.status(402).set({
        'X-Payment-Required': 'sol',
        'X-Payment-Amount': String(agent.price_xlm),
        'X-Payment-Address': agent.owner_wallet,
        'X-Payment-Network': 'solana',
        'X-Payment-Facilitator': facilitatorUrl,
        'X-Payment-Memo': memo,
      }).json({
        error: 'Payment required',
        payment_details: {
          amount_xlm: agent.price_xlm,
          address: agent.owner_wallet,
          network: 'solana',
          facilitator_url: facilitatorUrl,
          memo,
        },
      });
      return;
    }

    const requestId = uuidv4();
    const isMarketplaceAgent = ['public', 'forked'].includes(String(agent.visibility || ''));
    const effectivePrompt = isMarketplaceAgent && body.customization?.prompt
      ? body.customization.prompt
      : agent.system_prompt;

    if (paymentTxHash && priceXlm > 0) {
      const paymentVerification = await verifyPayment(paymentTxHash, agent.owner_wallet, priceXlm, agentId, callerWallet || undefined);
      if (!paymentVerification.valid) {
        res.status(402).json({
          error: 'Payment verification failed',
          details: paymentVerification.error || null,
        });
        return;
      }
    }

    let output = 'Unknown model';
    if (agent.model === 'openai-gpt4o-mini') {
      if (!process.env.OPENAI_API_KEY) {
        output = '[Demo mode] OpenAI API key not configured.';
      } else {
        try {
          const { runOpenAIAgent } = await import('../services/openai');
          output = await runOpenAIAgent(effectivePrompt, input);
        } catch (err) {
          output = `[AI Error] ${String(err)}`;
        }
      }
    } else if (agent.model === 'anthropic-claude-haiku') {
      if (!process.env.ANTHROPIC_API_KEY) {
        output = '[Demo mode] Anthropic API key not configured.';
      } else {
        try {
          const { runAnthropicAgent } = await import('../services/anthropic');
          output = await runAnthropicAgent(effectivePrompt, input);
        } catch (err) {
          output = `[AI Error] ${String(err)}`;
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const baseRequestPayload = {
          id: requestId,
          agent_id: agentId,
          caller_wallet: callerWallet || null,
          caller_ip: req.headers['x-forwarded-for'] || null,
          input_payload: { input, customization: body.customization || null },
          payment_tx_hash: paymentTxHash || null,
          tx_explorer_url: paymentTxHash ? explorerUrl(paymentTxHash) : null,
          payment_amount_xlm: paymentTxHash ? priceXlm : 0,
          status: 'success',
          latency_ms: latencyMs,
        };

        let insertRes = await supabase.from('agent_requests').insert({ ...baseRequestPayload, output_payload: { output } });
        if (isMissingColumnError(insertRes.error, 'output_payload')) {
          insertRes = await supabase.from('agent_requests').insert({ ...baseRequestPayload, output_response: { output } });
        }

        if (!insertRes.error && paymentTxHash) {
          await supabase.from('invoices').upsert({
            request_id: requestId,
            agent_id: agentId,
            owner_wallet: agent.owner_wallet,
            caller_wallet: callerWallet || null,
            amount_xlm: priceXlm,
            tx_hash: paymentTxHash,
            tx_explorer_url: explorerUrl(paymentTxHash),
          }, { onConflict: 'request_id' });
        }

        await supabase.from('agents').update({
          total_requests: Number(agent.total_requests || 0) + 1,
          total_earned_xlm: paymentTxHash ? Number(agent.total_earned_xlm || 0) + priceXlm : Number(agent.total_earned_xlm || 0),
          updated_at: new Date().toISOString(),
        }).eq('id', agentId);
      } catch (dbErr) {
        incrementDemoAgentStats(agentId, { paid: Boolean(paymentTxHash), amountXlm: Number(agent.price_xlm || 0) });
      }
    } else {
      incrementDemoAgentStats(agentId, { paid: Boolean(paymentTxHash), amountXlm: Number(agent.price_xlm || 0) });
    }

    const activity: MarketplaceActivityEvent = {
      eventType: 'agent_run',
      agentId,
      agentName: agent.name,
      callerWallet: callerWallet || undefined,
      ownerWallet: agent.owner_wallet,
      priceXlm: paymentTxHash ? priceXlm : 0,
      txHash: paymentTxHash || undefined,
      txExplorerUrl: paymentTxHash ? explorerUrl(paymentTxHash) : undefined,
      timestamp: new Date().toISOString(),
    };

    try {
      const key = process.env.ABLY_API_KEY;
      if (key) {
        const ably = new Ably.Rest({ key });
        await ably.channels.get('marketplace').publish(activity.eventType, activity);
      }
      await publish(TOPICS.MARKETPLACE_ACTIVITY, activity);
    } catch (err) {
      console.warn('[run] Unable to publish activity:', err);
    }

    res.json({
      output,
      request_id: requestId,
      latency_ms: latencyMs,
      tx_hash: paymentTxHash || null,
      tx_explorer_url: paymentTxHash ? explorerUrl(paymentTxHash) : null,
      billed_xlm: paymentTxHash ? priceXlm : 0,
      runtime: {
        agent_id: agentId,
        owner_wallet: agent.owner_wallet,
        api_endpoint: agent.api_endpoint || null,
        api_key: agent.api_key || null,
        model: agent.model,
        visibility: agent.visibility,
      },
    });
  } catch (err) {
    console.error('Agent run error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
