'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { getProgram, BN } from '@/lib/anchor_program';
import { tokenConfig } from '@/lib/token';
import { Agent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const FORK_FEE_SOL = 0.1; // 10x base price for lifetime ownership

interface ForkModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onSuccess: (txHash: string) => void;
}

export default function ForkModal({ isOpen, onClose, agent, onSuccess }: ForkModalProps) {
  const [customName, setCustomName] = useState(`${agent.name} (Fork)`);
  const [step, setStep] = useState<'idle' | 'paying' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFork = async () => {
    setStep('paying');
    setError(null);
    try {
      const provider = (window as any).phantom?.solana || (window as any).solana;
      if (!provider) throw new Error('Connect Phantom wallet first');

      const walletAddress = provider.publicKey.toString();
      const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
      const connection = new Connection(rpcUrl, 'confirmed');

      const feeLamports = Math.round(FORK_FEE_SOL * LAMPORTS_PER_SOL);
      const programId = process.env.NEXT_PUBLIC_SOLANA_CONTRACT_ID || '6tpsQxcZaHaj8zJsRv5tHWCpeQ2HT7bBrxC3y4MCaRCi';
      
      let txHash = '';
      let onChainForkSupported = false;

      // Check if program supports fork_agent (optimistic check) and if we have valid IDs
      const hasValidIds = !!agent.anchor_contract_id && !!agent.owner_wallet;
      
      try {
        if (hasValidIds) {
          const program = getProgram(connection, provider);
          if (program.methods.forkAgent) onChainForkSupported = true;
        }
      } catch (e) {
        console.warn('Anchor fork check failed, using fallback:', e);
      }

      const safePublicKey = (addr: any, fallback: string) => {
        try {
          if (!addr || typeof addr !== 'string' || addr.startsWith('0x') || addr.length < 32) {
             return new PublicKey(fallback);
          }
          return new PublicKey(addr);
        } catch {
          return new PublicKey(fallback);
        }
      };

      const TREASURY = '8nD1jMsRYEc8qCauqbKbWaoVmF8wsf13baDzQcfaJLUv';

      if (onChainForkSupported && hasValidIds) {
        try {
          const program = getProgram(connection, provider);
          const newAgentAccount = Keypair.generate();
          const newAgentIdStr = uuidv4().slice(0, 8);
          
          txHash = await program.methods
            .forkAgent(
              newAgentIdStr,
              new BN(feeLamports),
              'v1_fork'
            )
            .accounts({
              forker: safePublicKey(walletAddress, TREASURY),
              sourceAgent: safePublicKey(agent.anchor_contract_id, TREASURY),
              sourceOwner: safePublicKey(agent.owner_wallet, TREASURY),
              newAgent: newAgentAccount.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([newAgentAccount])
            .rpc({ skipPreflight: true });
        } catch (anchorErr: any) {
          console.error('Anchor fork failed, falling back:', anchorErr);
          onChainForkSupported = false;
        }
      }

      if (!txHash) {
        // Fallback: Direct System Transfer to source owner
        const targetWallet = agent.owner_wallet || TREASURY;
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: safePublicKey(walletAddress, TREASURY),
            toPubkey: safePublicKey(targetWallet, TREASURY),
            lamports: feeLamports,
          })
        );
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = new PublicKey(walletAddress);
        const signed = await provider.signTransaction(tx);
        txHash = await connection.sendRawTransaction(signed.serialize());
      }

      // Call backend to finalize the fork record
      const res = await fetch(`/api/agents/${agent.id}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          txHash,
          name: customName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Backend synchronization failed');
      }

      onSuccess(txHash);
    } catch (err: any) {
      console.error('Fork failed:', err);
      setError(err.message || 'Transaction failed');
      setStep('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md rounded-3xl border border-[rgba(212,175,55,0.3)] bg-[#1a1a1c] p-6 shadow-2xl">
            <h2 className="font-cinzel text-xl font-bold text-[#d4af37] mb-1 uppercase tracking-widest">Decree of Forking</h2>
            <p className="text-[#cbb38b] text-[10px] font-mono uppercase mb-6 opacity-60 tracking-tighter">Create a subordinate instance of this Praetorian.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase mb-1.5 tracking-widest">Unit Designation</label>
                <input value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#d4af37]/40 font-mono" />
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                <label className="block text-[10px] font-mono text-white/40 uppercase mb-1.5 tracking-widest">Fork Tribute</label>
                <div className="text-2xl font-cinzel text-[#d4af37] font-bold">
                  {FORK_FEE_SOL} <span className="text-sm opacity-60">SOL</span>
                </div>
                <div className="text-[10px] font-mono text-white/20 mt-1">Life-time ownership fee sent to originator.</div>
              </div>
            </div>

            {error && <div className="mb-4 p-3 rounded bg-red-900/10 border border-red-900/40 text-red-400 text-[10px] font-mono">{error}</div>}

            <div className="flex gap-3">
              <button onClick={onClose} disabled={step === 'paying'} className="flex-1 py-3 text-[10px] font-mono border border-white/10 text-gray-500 rounded-xl hover:text-white transition-all uppercase tracking-widest">Cancel</button>
              <button onClick={handleFork} disabled={step === 'paying' || !customName} className="flex-1 py-3 text-[10px] font-mono bg-[#d4af37] text-black rounded-xl font-bold hover:bg-[#c69b2f] transition-all disabled:opacity-50 uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                {step === 'paying' ? 'Sealing Sig...' : 'Confirm Fork'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
