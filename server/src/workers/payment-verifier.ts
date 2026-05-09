/**
 * consumers/payment-verifier.ts
 *
 * Listens on `valdyum.payment.pending`.
 *
 * For each pending payment it:
 *  1. Polls Solana RPC for transaction confirmation.
 *  2. Waits until the specific tx hash is confirmed (with a timeout).
 *  3. Publishes `valdyum.payment.confirmed` so the Agent Executor can proceed.
 */

import { createConsumer, publish } from '../services/qstash';
import { waitForTransaction } from '../services/stellar';
import { TOPICS, type PaymentPendingEvent, type PaymentConfirmedEvent } from '@valdyum/shared';

const CONSUMER_GROUP = 'valdyum-payment-verifier';
const TX_TIMEOUT_MS = 120_000; // 2 minutes

const consumer = createConsumer<PaymentPendingEvent>(
  CONSUMER_GROUP,
  TOPICS.PAYMENT_PENDING,
  async (event: PaymentPendingEvent) => {
    const {
      requestId,
      agentId,
      txHash,
      callerWallet,
      ownerWallet,
      priceSol,
      input,
      memo,
    } = event;

    console.log(`[PaymentVerifier] Verifying tx ${txHash} for request ${requestId}`);

    try {
      const confirmedOnChain = await waitForTransaction(txHash, TX_TIMEOUT_MS);
      if (!confirmedOnChain) {
        console.warn(`[PaymentVerifier] Timeout waiting for tx ${txHash}`);
        return;
      }

      const confirmed: PaymentConfirmedEvent = {
        requestId,
        agentId,
        txHash,
        callerWallet,
        ownerWallet,
        priceSol,
        input,
        confirmedAt: new Date().toISOString(),
      };

      await publish(TOPICS.PAYMENT_CONFIRMED, confirmed);
      console.log(`[PaymentVerifier] Published payment.confirmed for request ${requestId}`);
    } catch (err) {
      console.error(`[PaymentVerifier] Failed to verify tx ${txHash}:`, err);
    }
  }
);

export default consumer;
