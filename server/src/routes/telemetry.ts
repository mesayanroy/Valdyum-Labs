import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Ably from 'ably';

const router: Router = Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type CliEvent = {
  id: string;
  wallet: string | null;
  type: string;
  status: 'success' | 'error' | 'info';
  message: string;
  agentId?: string | null;
  pipelineId?: string | null;
  createdAt: string;
};

type PipelineExecution = {
  id: string;
  wallet: string | null;
  pipelineName: string;
  status: 'running' | 'success' | 'error';
  executedAt: string;
  durationMs?: number;
};

const cliEvents: CliEvent[] = [];
const pipelineExecutions: PipelineExecution[] = [];

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function publish(channel: string, payload: unknown) {
  const key = process.env.ABLY_API_KEY;
  if (!key) return;
  try {
    const ably = new Ably.Rest({ key });
    await ably.channels.get(channel).publish('event', payload);
  } catch {
    // ignore
  }
}

router.post('/cli', async (req: Request, res: Response) => {
  const body = req.body || {};
  const event: CliEvent = {
    id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    wallet: body.wallet || null,
    type: String(body.type || 'cli'),
    status: (body.status as CliEvent['status']) || 'info',
    message: String(body.message || 'CLI event'),
    agentId: body.agentId || null,
    pipelineId: body.pipelineId || null,
    createdAt: body.createdAt || new Date().toISOString(),
  };

  cliEvents.unshift(event);
  cliEvents.splice(100);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('cli_events').insert({
        id: event.id,
        wallet_address: event.wallet,
        event_type: event.type,
        status: event.status,
        message: event.message,
        agent_id: event.agentId,
        pipeline_id: event.pipelineId,
        created_at: event.createdAt,
      });
    } catch {
      // ignore
    }
  }

  await publish('cli-events', event);
  res.json({ ok: true, event });
});

router.get('/cli', async (req: Request, res: Response) => {
  const wallet = req.query.wallet as string | undefined;
  const supabase = getSupabase();

  if (supabase) {
    let query = supabase
      .from('cli_events')
      .select('id, wallet_address, event_type, status, message, agent_id, pipeline_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (wallet) query = query.eq('wallet_address', wallet);
    const { data } = await query;
    if (data) {
      res.json({
        events: data.map((row) => ({
          id: row.id,
          wallet: row.wallet_address,
          type: row.event_type,
          status: row.status,
          message: row.message,
          agentId: row.agent_id,
          pipelineId: row.pipeline_id,
          createdAt: row.created_at,
        })),
      });
      return;
    }
  }

  const filtered = wallet ? cliEvents.filter((event) => event.wallet === wallet) : cliEvents;
  res.json({ events: filtered.slice(0, 50) });
});

router.post('/pipelines', async (req: Request, res: Response) => {
  const body = req.body || {};
  const run: PipelineExecution = {
    id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    wallet: body.wallet || null,
    pipelineName: String(body.pipelineName || 'pipeline'),
    status: (body.status as PipelineExecution['status']) || 'running',
    executedAt: body.executedAt || new Date().toISOString(),
    durationMs: body.durationMs ? Number(body.durationMs) : undefined,
  };

  pipelineExecutions.unshift(run);
  pipelineExecutions.splice(100);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('pipeline_runs').insert({
        id: run.id,
        wallet_address: run.wallet,
        pipeline_name: run.pipelineName,
        status: run.status,
        executed_at: run.executedAt,
        duration_ms: run.durationMs,
      });
    } catch {
      // ignore
    }
  }

  await publish('pipeline-events', run);
  res.json({ ok: true, execution: run });
});

router.get('/pipelines', async (req: Request, res: Response) => {
  const wallet = req.query.wallet as string | undefined;
  const supabase = getSupabase();

  if (supabase) {
    let query = supabase
      .from('pipeline_runs')
      .select('id, wallet_address, pipeline_name, status, executed_at, duration_ms')
      .order('executed_at', { ascending: false })
      .limit(20);
    if (wallet) query = query.eq('wallet_address', wallet);
    const { data } = await query;
    if (data) {
      res.json({
        executions: data.map((row) => ({
          id: row.id,
          wallet: row.wallet_address,
          pipelineName: row.pipeline_name,
          status: row.status,
          executedAt: row.executed_at,
          durationMs: row.duration_ms,
        })),
      });
      return;
    }
  }

  const filtered = wallet ? pipelineExecutions.filter((run) => run.wallet === wallet) : pipelineExecutions;
  res.json({ executions: filtered.slice(0, 20) });
});

export default router;
