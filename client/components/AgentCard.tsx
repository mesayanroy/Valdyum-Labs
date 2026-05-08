'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Agent } from '@/types';
import { truncateAddress } from '@/lib/stellar';
import { tokenConfig, tokenMetadataLabel } from '@/lib/token';

interface AgentCardProps {
  agent: Agent;
  onFork?: (agent: Agent) => void;
}

const modelBadgeColor: Record<string, string> = {
  'openai-gpt4o-mini': 'bg-[rgba(0,200,100,0.12)] text-green-400 border-green-900',
  'anthropic-claude-haiku': 'bg-[rgba(255,184,0,0.12)] text-[#FFB800] border-yellow-900',
};

const modelLabel: Record<string, string> = {
  'openai-gpt4o-mini': 'GPT-4o Mini',
  'anthropic-claude-haiku': 'Claude Haiku',
};

export default function AgentCard({ agent, onFork }: AgentCardProps) {
  const [showPackModal, setShowPackModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const safeOwner = agent.owner_wallet || 'Unknown';
  const totalRequests = Number(agent.total_requests ?? 0);
  const priceXlm = Number(agent.price_xlm ?? 0);
  const apiEndpoint = agent.api_endpoint || `/api/agents/${agent.id}/run`;

  const runtimeJson = useMemo(() => JSON.stringify({
    agentId: agent.id,
    name: agent.name,
    description: agent.description || '',
    apiEndpoint,
    pricing: {
      amount: priceXlm,
      token: tokenConfig.symbol,
      network: `solana:${tokenConfig.network}`,
    },
    wallet: {
      owner: safeOwner,
      payoutFlow: 'Agent wallet receives payments; withdraw via Phantom after settlement.',
    },
    instructions: {
      run: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Tx-Hash': '<solana_tx_signature>',
          'X-Payment-Wallet': '<payer_wallet>',
        },
        body: { input: 'Describe the task for this agent' },
      },
      pipeline: {
        step: 'Add to Valdyum pipeline manager as a task node.',
      },
    },
  }, null, 2), [agent.id, agent.name, agent.description, apiEndpoint, priceXlm, safeOwner]);

  useEffect(() => {
    const blob = new Blob([runtimeJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [runtimeJson]);

  const cliSnippet = `valdyum agents:run --id ${agent.id} --prompt \"run my task\" --secret $SOLANA_AGENT_SECRET`;

  return (
    <>
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 0 24px rgba(212,175,55,0.18)' }}
      className="rounded-xl border border-[rgba(212,175,55,0.25)] bg-[rgba(20,13,9,0.75)] p-5 flex flex-col gap-3 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-syne font-bold text-white text-lg leading-tight">{agent.name}</h3>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{agent.description || 'No description'}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-mono px-2 py-0.5 rounded border ${modelBadgeColor[agent.model] || 'bg-gray-800 text-gray-400 border-gray-700'}`}
        >
          {modelLabel[agent.model] || agent.model}
        </span>
      </div>

        {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.12)] text-[#d4af37] border border-[rgba(212,175,55,0.35)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

      <div className="flex items-center justify-between text-xs font-mono text-[#b8a38a] border-t border-[rgba(255,255,255,0.05)] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#00FFE5] to-[#FFB800] flex items-center justify-center text-[8px] text-black font-bold shrink-0">
            {safeOwner.slice(1, 2)}
          </span>
          <a
            href={`/dashboard?wallet=${safeOwner}`}
            title={`Owner: ${safeOwner}`}
            className="hover:text-[#d4af37] transition-colors truncate max-w-[90px]"
            onClick={(e) => e.stopPropagation()}
          >
            {truncateAddress(safeOwner)}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span>{totalRequests.toLocaleString()} reqs</span>
          <span className="text-[#d4af37]">{priceXlm} {tokenConfig.symbol}/req</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <Link
          href={`/agents/${agent.id}`}
          className="text-center py-1.5 text-xs font-mono border border-[#d4af37] text-[#d4af37] rounded hover:bg-[#d4af37] hover:text-black transition-all"
        >
          Use API
        </Link>
        <Link
          href={`/agents/${agent.id}#run`}
          className="text-center py-1.5 text-xs font-mono border border-[rgba(255,255,255,0.15)] text-[#b8a38a] rounded hover:border-[#d4af37] hover:text-[#d4af37] transition-all"
        >
          Run
        </Link>
        <button
          onClick={() => onFork?.(agent)}
          className="py-1.5 text-xs font-mono border border-[rgba(255,255,255,0.15)] text-[#b8a38a] rounded hover:border-[#d4af37] hover:text-[#d4af37] transition-all"
        >
          Fork
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowPackModal(true); }}
          className="py-1.5 text-xs font-mono border border-[rgba(212,175,55,0.4)] text-[#d4af37] rounded hover:bg-[rgba(212,175,55,0.12)] transition-all"
        >
          Agent Pack
        </button>
      </div>
    </motion.div>

    <AnimatePresence>
      {showPackModal && (
        <motion.div
          key="pack-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowPackModal(false)}
        >
          <motion.div
            key="pack-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#120c08] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-syne font-bold text-[#d4af37] text-lg">Agent Runtime Pack</h2>
              <button
                onClick={() => setShowPackModal(false)}
                className="text-gray-500 hover:text-white text-lg leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-2">CLI</div>
                <pre className="text-xs font-mono text-white/80 whitespace-pre-wrap">{cliSnippet}</pre>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-2">Payout Flow</div>
                <p className="text-xs font-mono text-white/70">
                  Payments land in the agent wallet. Withdraw to your Phantom wallet after settlement.
                </p>
                <p className="text-[10px] font-mono text-[#d4af37] mt-2">{tokenMetadataLabel()}</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-2">JSON Payload</div>
              <pre className="max-h-[220px] overflow-y-auto text-[11px] font-mono text-white/70 whitespace-pre-wrap">{runtimeJson}</pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(runtimeJson)}
                className="px-3 py-1.5 rounded-lg border border-[rgba(212,175,55,0.5)] text-[#d4af37] text-xs font-mono hover:bg-[rgba(212,175,55,0.12)]"
              >
                Copy JSON
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(cliSnippet)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-white/70 text-xs font-mono hover:text-white"
              >
                Copy CLI
              </button>
              <a
                href={downloadUrl}
                download={`${agent.name.replace(/\s+/g, '_')}_agent.json`}
                className="px-3 py-1.5 rounded-lg border border-[#FFB800]/50 text-[#FFB800] text-xs font-mono hover:bg-[rgba(255,184,0,0.1)]"
              >
                Download JSON
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
