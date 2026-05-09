'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram, BN } from '@/lib/anchor_program';

export default function DeploymentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const walletAddress = localStorage.getItem('wallet_address');
      if (!walletAddress) throw new Error('Connect wallet first');

      const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL 
        || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
      const connection = new Connection(rpcUrl, 'confirmed');
      const provider = (window as any).solana;
      if (!provider) throw new Error('Phantom wallet not found');
      
      const program = getProgram(connection, provider);
      const workflowAccount = Keypair.generate();
      
      const workflowId = `workflow_${Math.random().toString(36).substring(2, 10)}`;
      const dagHash = btoa('workflow_dag_placeholder').slice(0, 32);

      await program.methods
        .registerWorkflow(
          new PublicKey(walletAddress),
          workflowId,
          new BN(0), // Free or fixed price for now
          dagHash
        )
        .accounts({
          caller: new PublicKey(walletAddress),
          workflow: workflowAccount.publicKey,
          system_program: SystemProgram.programId,
        })
        .signers([workflowAccount])
        .rpc();

      setDeployed(true);
      setTimeout(() => {
        setDeployed(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Deployment failed: ' + String(err));
    } finally {
      setDeploying(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl rounded-3xl border border-[rgba(212,175,55,0.3)] bg-[#120c08] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-cinzel text-xl font-semibold text-[#d4af37]">Decree of Deployment</h2>
                <p className="font-mono text-[10px] text-[#cbb38b] uppercase tracking-widest">Select Praetorian execution mode and runtime options.</p>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Local Legion Runtime', desc: 'Execute via valdyum CLI with wallet signatures.' },
                { title: 'Cloud Imperium', desc: 'Hosted runners with managed wallets + scaling.' },
                { title: 'Senatus Sandbox', desc: 'Devnet execution with replay + faucet.' },
                { title: 'Mars GPU Optimization', desc: 'Enable Metal/ROCm + GPU telemetry.' },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-mono text-xs text-white">{card.title}</div>
                  <p className="mt-2 text-[11px] text-[#cbb38b]">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Network RPC</label>
                <select className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]">
                  <option>Solana Testnet</option>
                  <option>Solana Devnet</option>
                  <option>Solana Mainnet</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Formation Type</label>
                <select className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#d4af37]">
                  <option>Testudo (Sequential DAG)</option>
                  <option>Phalanx (Parallel Group)</option>
                  <option>Triarii (Hybrid AI Optimized)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-[10px] font-mono text-[#cbb38b]">0x402 payment payloads will be auto-attached to every transaction.</div>
              <button 
                onClick={handleDeploy}
                disabled={deploying || deployed}
                className="px-6 py-2 rounded-xl bg-[#d4af37] text-black font-mono text-xs font-semibold hover:bg-[#c69b2f] disabled:opacity-50 transition-all">
                {deploying ? 'Awaiting Anchor Sig...' : deployed ? 'Decree Published!' : 'Publish Decree'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
