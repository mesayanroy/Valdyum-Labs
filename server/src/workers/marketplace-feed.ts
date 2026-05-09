/**
 * consumers/marketplace-feed.ts
 *
 * Listens on `valdyum.agent.completed` AND `valdyum.billing.updated`.
 *
 * For each event it:
 *  1. Builds a MarketplaceActivityEvent.
 *  2. Publishes it to Ably channel "marketplace" so the frontend hook can
 *     update the live feed without polling.
 *  3. Also publishes `valdyum.marketplace.activity` to qstash so other
 *     consumers can react to marketplace events.
 */

import Ably from 'ably';
import { createConsumer, publish } from '../services/qstash';
import {
  TOPICS,
  type AgentCompletedEvent,
  type BillingUpdatedEvent,
  type MarketplaceActivityEvent,
} from '@valdyum/shared';

const CONSUMER_GROUP_COMPLETED = 'valdyum-marketplace-feed-completed';
const CONSUMER_GROUP_BILLING = 'valdyum-marketplace-feed-billing';
const ABLY_CHANNEL = 'marketplace';

function getAblyClient(): Ably.Rest {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    throw new Error('ABLY_API_KEY is not set.');
  }
  return new Ably.Rest({ key });
}

async function pushToAbly(activity: MarketplaceActivityEvent): Promise<void> {
  try {
    const ably = getAblyClient();
    const channel = ably.channels.get(ABLY_CHANNEL);
    await channel.publish(activity.eventType, activity);
    console.log(`[MarketplaceFeed] Published "${activity.eventType}" to Ably for agent ${activity.agentId}`);
  } catch (err) {
    console.error('[MarketplaceFeed] Ably publish error:', err);
  }
}

// ─── Consumer 1: agent.completed → marketplace activity ──────────────────────

export const completedConsumer = createConsumer<AgentCompletedEvent>(
  CONSUMER_GROUP_COMPLETED,
  TOPICS.AGENT_COMPLETED,
  async (event: AgentCompletedEvent) => {
    const activity: MarketplaceActivityEvent = {
      eventType: 'agent_run',
      agentId: event.agentId,
      agentName: event.agentId, // will be enriched by the frontend from Supabase
      callerWallet: event.callerWallet,
      ownerWallet: event.ownerWallet,
      priceSol: event.priceSol,
      timestamp: event.completedAt,
    };

    await pushToAbly(activity);
    await publish(TOPICS.MARKETPLACE_ACTIVITY, activity);
  }
);

// ─── Consumer 2: billing.updated → payment_received activity ─────────────────

export const billingConsumer = createConsumer<BillingUpdatedEvent>(
  CONSUMER_GROUP_BILLING,
  TOPICS.BILLING_UPDATED,
  async (event: BillingUpdatedEvent) => {
    const activity: MarketplaceActivityEvent = {
      eventType: 'payment_received',
      agentId: event.agentId,
      agentName: event.agentId,
      ownerWallet: event.ownerWallet,
      priceSol: event.earnedSol,
      totalEarnedSol: event.totalEarnedSol,
      totalRequests: event.totalRequests,
      timestamp: event.updatedAt,
    };

    await pushToAbly(activity);
    await publish(TOPICS.MARKETPLACE_ACTIVITY, activity);
  }
);
