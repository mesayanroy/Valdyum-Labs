/**
 * consumers/chain-syncer.ts
 *
 * Listens for on-chain state changes from the Anchor contract and publishes
 * `valdyum.chain.synced` events.
 *
 * In a full implementation this would open a Anchor RPC subscription.
 * For now it polls the RPC account transactions stream for the contract's
 * deployment account and emits a ChainSyncedEvent for each new ledger entry.
 */

import { createConsumer, publish } from '../services/qstash';
import { watchAccountTransactions } from '../services/solana-watcher';
import { TOPICS, type ChainSyncedEvent } from '@valdyum/shared';

const CONSUMER_GROUP = 'valdyum-chain-syncer';
const CONTRACT_ID = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || process.env.SOLANA_PROGRAM_ID || '';

/**
 * Start the RPC SSE watcher for the Anchor contract account and re-publish
 * to QStash so downstream services can react without coupling to RPC directly.
 */
export function startChainSyncerStream(): () => void {
  if (!CONTRACT_ID) {
    console.warn('[ChainSyncer] NEXT_PUBLIC_SOLANA_PROGRAM_ID is not set – chain syncer disabled.');
    return () => undefined;
  }

  console.log(`[ChainSyncer] Watching Solana for program account ${CONTRACT_ID}`);

  const close = watchAccountTransactions(CONTRACT_ID, async (tx: any) => {
    const event: ChainSyncedEvent = {
      contractId: CONTRACT_ID,
      nodeId: tx.id,
      ledgerSequence: tx.ledger_attr ?? 0,
      data: {
        hash: tx.hash,
        memo: tx.memo,
        fee: tx.fee_charged,
        operationCount: tx.operation_count,
        successful: tx.successful,
        createdAt: tx.created_at,
      },
      syncedAt: new Date().toISOString(),
    };

    try {
      await publish(TOPICS.CHAIN_SYNCED, event);
      console.log(`[ChainSyncer] Synced ledger op ${tx.hash} for contract ${CONTRACT_ID}`);
    } catch (err) {
      console.error('[ChainSyncer] Publish error:', err);
    }
  });

  return close;
}

/**
 * QStash consumer for chain.synced events (so other microservices can react
 * without connecting to RPC themselves).
 */
export const chainSyncedConsumer = createConsumer<ChainSyncedEvent>(
  CONSUMER_GROUP,
  TOPICS.CHAIN_SYNCED,
  async (event: ChainSyncedEvent) => {
    console.log(
      `[ChainSyncer] Received chain.synced: contract=${event.contractId} ledger=${event.ledgerSequence}`
    );
    // Extend here: update on-chain agent registry in Supabase, invalidate caches, etc.
  }
);
