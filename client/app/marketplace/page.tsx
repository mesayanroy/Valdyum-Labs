'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AgentCard from '@/components/AgentCard';
import { Agent } from '@/types';
import { solExplorerTx } from '@/lib/phantom';
import { tokenConfig } from '@/lib/token';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getProgram, BN } from '@/lib/anchor_program';

import ForkModal from '@/components/ForkModal';

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [forkingAgent, setForkingAgent] = useState<Agent | null>(null);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents/list');
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('/background/slide33.png')] bg-cover bg-center opacity-15" />
      <div className="max-w-[1440px] mx-auto px-6 py-12 relative z-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-12">
          <div>
            <h1 className="font-cinzel text-4xl font-bold text-[#d4af37] mb-2 tracking-wider">The Forum</h1>
            <p className="font-mono text-sm text-[#cbb38b]">
              Discover and fork autonomous Praetorian agents. Powered by Anchor and 0x402.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.2)]">
              <span className="font-mono text-[10px] text-[#cbb38b] uppercase tracking-widest">Global TVL:</span>
              <span className="font-mono text-sm text-[#d4af37] ml-2 font-bold">128,492 SOL</span>
            </div>
          </div>
        </div>

        {successTx && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏛️</span>
              <div>
                <div className="font-mono text-sm text-[#d4af37] font-bold">Agent Forked Successfully</div>
                <div className="font-mono text-[10px] text-[#cbb38b] mt-0.5">Senatus record updated. Tx: {successTx.slice(0, 16)}...</div>
              </div>
            </div>
            <a href={solExplorerTx(successTx)} target="_blank" rel="noreferrer"
              className="px-4 py-1.5 text-[10px] font-mono border border-[#d4af37] text-[#d4af37] rounded-lg hover:bg-[#d4af37] hover:text-black transition-all">
              View Transaction
            </a>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[400px] rounded-3xl bg-black/40 border border-white/10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onFork={() => setForkingAgent(agent)} />
            ))}
          </div>
        )}
      </div>

      {forkingAgent && (
        <ForkModal
          isOpen={!!forkingAgent}
          agent={forkingAgent}
          onClose={() => setForkingAgent(null)}
          onSuccess={(tx) => {
            setSuccessTx(tx);
            setForkingAgent(null);
          }}
        />
      )}
    </div>
  );
}
