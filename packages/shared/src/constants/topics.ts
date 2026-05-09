/**
 * QStash topic registry — single source of truth for all topic names.
 * Extracted from lib/qstash.ts so both client and server can reference
 * topic names without pulling in the QStash SDK.
 */

export const TOPICS = {
  /** Emitted by the /run route once a tx hash has been supplied by the caller. */
  PAYMENT_PENDING: 'valdyum.payment.pending',

  /** Emitted by the Payment Verifier once RPC confirms the tx. */
  PAYMENT_CONFIRMED: 'valdyum.payment.confirmed',

  /** Emitted by the Agent Executor once the AI model has returned a response. */
  AGENT_COMPLETED: 'valdyum.agent.completed',

  /** Emitted by the Billing Aggregator after updating Supabase earnings. */
  BILLING_UPDATED: 'valdyum.billing.updated',

  /** Emitted by the Marketplace Feed consumer before pushing to Ably. */
  MARKETPLACE_ACTIVITY: 'valdyum.marketplace.activity',

  /** Emitted by the Chain Syncer for any on-chain state change. */
  CHAIN_SYNCED: 'valdyum.chain.synced',

  /** Used by the A2A Router to forward requests between agents. */
  A2A_REQUEST: 'valdyum.a2a.request',

  /** Used by the A2A Router to deliver responses between agents. */
  A2A_RESPONSE: 'valdyum.a2a.response',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];
