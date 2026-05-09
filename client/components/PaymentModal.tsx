'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { PhantomProvider } from '../types/phantom';
import { tokenConfig, tokenMetadataLabel } from '@/lib/token';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { getProgram, BN } from '@/lib/anchor_program';

function getPhantomProvider(): PhantomProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.phantom?.solana || window.solana;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  priceSol: number;
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

async function buildAndSendPayment(
  agentId: string,
  amountSol: number,
  ownerAddress: string
): Promise<{ txHash: string; sender: string }> {
  const provider = getPhantomProvider();
  if (!provider?.isPhantom) throw new Error('Phantom wallet not found');

  await provider.connect();
  const sender = provider.publicKey?.toString();
  if (!sender) throw new Error('Could not read connected wallet public key');

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
  const connection = new Connection(rpcUrl, 'confirmed');

  const feeLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  let agentPubkey: PublicKey | null = null;
  
  try {
    agentPubkey = new PublicKey(agentId);
  } catch {
    agentPubkey = null;
  }

  // Check if agent account exists on-chain as an AgentRecord
  let onChain = false;
  if (agentPubkey) {
    const acc = await connection.getAccountInfo(agentPubkey);
    if (acc && acc.owner.toString() === (process.env.NEXT_PUBLIC_SOLANA_CONTRACT_ID || '6tpsQxcZaHaj8zJsRv5tHWCpeQ2HT7bBrxC3y4MCaRCi')) {
      onChain = true;
    }
  }

  if (onChain && agentPubkey) {
    // Registered on-chain: Use Anchor record_payment
    const program = getProgram(connection, provider);
    const txHash = await program.methods
      .recordPayment(new BN(feeLamports))
      .accounts({
        payer: new PublicKey(sender),
        agent: agentPubkey,
      })
      .rpc({ skipPreflight: true });
    return { txHash, sender };
  } else {
    // Not on-chain or UUID: Fallback to direct System Transfer to owner
    const dest = new PublicKey(ownerAddress);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(sender),
        toPubkey: dest,
        lamports: feeLamports,
      })
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(sender);
    
    const signed = await provider.signTransaction(tx);
    const txHash = await connection.sendRawTransaction(signed.serialize());
    return { txHash, sender };
  }
}

export default function PaymentModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  priceSol,
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
      const { txHash, sender } = await buildAndSendPayment(agentId, priceSol, ownerAddress);

      setStep('submitting');
      const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
      setTxExplorerUrl(`https://explorer.solana.com/tx/${txHash}?cluster=${cluster}`);

      setStep('confirming');
      setStep('done');
      onPaymentSuccess(txHash, sender);
    } catch (err) {
      console.error('Payment error:', err);
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
            className="w-full max-w-md mx-4 rounded-3xl border border-[rgba(212,175,55,0.3)] bg-[#120b07] p-6 shadow-2xl"
          >
            <h2 className="font-cinzel text-xl font-bold text-white mb-1">Decree of Payment</h2>
            <p className="text-gray-400 text-sm mb-6">402 — Pay-per-request via Senatus Ledger</p>

            <div className="space-y-3 mb-6 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Agent</span>
                <span className="text-white">{agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="text-[#FFB800] font-bold">{priceSol} {tokenConfig.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Network</span>
                <span className={cluster === 'mainnet-beta' ? 'text-[#4ade80]' : 'text-[#00FFE5]'}>
                  Solana {cluster === 'mainnet-beta' ? 'Mainnet' : 'Testnet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner</span>
                <span className="text-gray-300 text-xs truncate max-w-[200px]">
                  {truncateAddress(ownerAddress)}
                </span>
              </div>
            </div>

            {paying && (
              <div className="mb-4 p-3 rounded bg-[rgba(0,255,229,0.06)] border border-[rgba(0,255,229,0.2)] text-[#00FFE5] text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse shrink-0" />
                {STEP_LABELS[step]}
              </div>
            )}

            {step === 'done' && txExplorerUrl && (
              <div className="mb-4 p-3 rounded bg-[rgba(74,222,128,0.08)] border border-green-900 text-[#4ade80] text-xs font-mono">
                ✓ Payment confirmed.{' '}
                <a href={txExplorerUrl} target="_blank" rel="noreferrer" className="underline hover:text-green-300">
                  View Explorer ↗
                </a>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded bg-red-900/20 border border-red-900/40 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={paying}
                className="flex-1 py-2.5 text-sm font-mono border border-white/10 text-gray-400 rounded-lg hover:text-white transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 py-2.5 text-sm font-mono bg-[#d4af37] text-black rounded-lg font-bold hover:bg-[#c69b2f] transition-colors disabled:opacity-50"
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

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}
