/**
 * consumers/billing-aggregator.ts
 *
 * Listens on `valdyum.agent.completed`.
 *
 * For each completed agent run it:
 *  1. Increments `total_requests` and `total_earned_sol` on the agent row.
 *  2. Publishes `valdyum.billing.updated` with the updated totals.
 */

import { createClient } from '@supabase/supabase-js';
import { createConsumer, publish } from '../services/qstash';
import { TOPICS, type AgentCompletedEvent, type BillingUpdatedEvent } from '@valdyum/shared';

const CONSUMER_GROUP = 'valdyum-billing-aggregator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase is not configured for the billing aggregator.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const consumer = createConsumer<AgentCompletedEvent>(
  CONSUMER_GROUP,
  TOPICS.AGENT_COMPLETED,
  async (event) => {
    const { agentId, ownerWallet, priceSol } = event;

    console.log(`[BillingAggregator] Updating earnings for agent ${agentId}`);

    const sb = getSupabase();

    // Read current totals
    const { data: agent, error: fetchErr } = await sb
      .from('agents')
      .select('total_requests, total_earned_sol')
      .eq('id', agentId)
      .single();

    if (fetchErr || !agent) {
      console.error(`[BillingAggregator] Cannot fetch agent ${agentId}:`, fetchErr);
      return;
    }

    const newTotalRequests = (agent.total_requests ?? 0) + 1;
    const newTotalEarned = (agent.total_earned_sol ?? 0) + priceSol;

    const { error: updateErr } = await sb
      .from('agents')
      .update({
        total_requests: newTotalRequests,
        total_earned_sol: newTotalEarned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateErr) {
      console.error(`[BillingAggregator] Update error for agent ${agentId}:`, updateErr);
      return;
    }

    const billing: BillingUpdatedEvent = {
      agentId,
      ownerWallet,
      earnedSol: priceSol,
      totalEarnedSol: newTotalEarned,
      totalRequests: newTotalRequests,
      updatedAt: new Date().toISOString(),
    };

    await publish(TOPICS.BILLING_UPDATED, billing);
    console.log(
      `[BillingAggregator] Agent ${agentId} | total_earned=${newTotalEarned} SOL | requests=${newTotalRequests}`
    );
  }
);

export default consumer;
