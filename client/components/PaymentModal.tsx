'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { PhantomProvider } from '../types/phantom';
import { tokenConfig } from '@/lib/token';

function getPhantomProvider(): PhantomProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.phantom?.solana || window.solana;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  priceXlm: number;
  ownerAddress: string;
  paymentMemo: string;
  onPaymentSuccess: (txHash: string, signerWallet: string) => void;
}

type PaymentStep = 'idle' | 'checking_wallet' | 'building_tx' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

const STEP_LABELS: Record<PaymentStep, string> = {
  idle: 'Sign & Pay',
  checking_wallet: 'Checking wallet...',
  building_tx: 'Building transaction...',
  signing: 'Sign in Phantom...',
  submitting: 'Submitting to Solana...',
  confirming: 'Confirming on ledger...',
  done: 'Done!',
  error: 'Retry',
};

function extractChainError(err: unknown): string {
  if (!err) return 'Unknown error';
  const msg = String(err);
  if (msg.toLowerCase().includes('phantom')) {
    return msg;
  }
  return msg.startsWith('Error:') ? msg.slice(7).trim() : msg;
}

async function waitForLedgerConfirmation(
  connection: import('@solana/web3.js').Connection,
  txHash: string,
  timeoutMs = 30_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await connection.getSignatureStatus(txHash);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        return;
      }
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}

async function buildAndSendSolanaTransfer(
  ownerAddress: string,
  amountSol: number
): Promise<{ txHash: string; sender: string }> {
  const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
  const provider = getPhantomProvider();

  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet is not installed. Please install Phantom and retry.');
  }

  await provider.connect();
  const sender = provider.publicKey?.toString();
  if (!sender) {
    throw new Error('Could not read connected wallet public key from Phantom.');
  }

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
  const connection = new Connection(rpcUrl, 'confirmed');

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const tx = new Transaction({
    feePayer: new PublicKey(sender),
    recentBlockhash: blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(sender),
      toPubkey: new PublicKey(ownerAddress),
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    })
  );

  const signed = await provider.signTransaction(tx);
  const txHash = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');

  try {
    await waitForLedgerConfirmation(connection, txHash);
  } catch {
    // non-fatal
  }

  return { txHash, sender };
}

export default function PaymentModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  priceXlm,
  ownerAddress,
  paymentMemo,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txExplorerUrl, setTxExplorerUrl] = useState<string | null>(null);

  const paying = step !== 'idle' && step !== 'done' && step !== 'error';

  const handlePay = async () => {
    setStep('checking_wallet');
    setError(null);
    setTxExplorerUrl(null);
    try {
      setStep('building_tx');
      setStep('signing');
      const { txHash, sender } = await buildAndSendSolanaTransfer(ownerAddress, priceXlm);

      setStep('submitting');
      const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
      setTxExplorerUrl(`https://explorer.solana.com/tx/${txHash}?cluster=${cluster}`);

      setStep('confirming');
      setStep('done');
      onPaymentSuccess(txHash, sender);
    } catch (err) {
      setError(extractChainError(err));
      setStep('error');
    }
  };

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4 rounded-2xl border border-[rgba(0,255,229,0.2)] bg-[#0a0a10] p-6"
          >
            <h2 className="font-syne text-xl font-bold text-white mb-1">Payment Required</h2>
            <p className="text-gray-400 text-sm mb-6">402 — Pay-per-request via Solana</p>

            <div className="space-y-3 mb-6 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Agent</span>
                <span className="text-white">{agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="text-[#FFB800] font-bold">{priceXlm} {tokenConfig.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Network</span>
                <span className={cluster === 'mainnet-beta' ? 'text-[#4ade80]' : 'text-[#00FFE5]'}>
                  Solana {cluster === 'mainnet-beta' ? 'Mainnet' : 'Testnet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Memo</span>
                <span className="text-gray-300 text-xs truncate max-w-[200px]">
                  {paymentMemo}
                </span>
              </div>
            </div>

            {/* Step progress */}
            {paying && (
              <div className="mb-4 p-3 rounded bg-[rgba(0,255,229,0.06)] border border-[rgba(0,255,229,0.2)] text-[#00FFE5] text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FFE5] animate-pulse shrink-0" />
                {STEP_LABELS[step]}
              </div>
            )}

            {step === 'done' && txExplorerUrl && (
              <div className="mb-4 p-3 rounded bg-[rgba(74,222,128,0.08)] border border-green-900 text-[#4ade80] text-xs font-mono">
                ✓ Payment confirmed on ledger.{' '}
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-green-300"
                >
                  View on Solana Explorer ↗
                </a>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded bg-[rgba(255,69,69,0.1)] border border-red-900 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={paying}
                className="flex-1 py-2.5 text-sm font-mono border border-[rgba(255,255,255,0.1)] text-gray-400 rounded-lg hover:text-white transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 py-2.5 text-sm font-mono bg-[#00FFE5] text-black rounded-lg font-bold hover:bg-[#00e6ce] transition-colors disabled:opacity-50"
              >
                {STEP_LABELS[step]}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
