'use client';

import { AnimatePresence, motion } from 'framer-motion';

export default function DeploymentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0c12] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-syne text-xl font-semibold text-white">Deploy Workflow</h2>
                <p className="font-mono text-xs text-white/40">Select execution mode and runtime options.</p>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Local CLI Runtime', desc: 'Execute via valdyum CLI with wallet signatures.' },
                { title: 'Cloud Runtime', desc: 'Hosted runners with managed wallets + scaling.' },
                { title: 'Sandbox Mode', desc: 'Devnet execution with replay + faucet.' },
                { title: 'GPU Optimization', desc: 'Enable Metal/ROCm + GPU telemetry.' },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-mono text-xs text-white">{card.title}</div>
                  <p className="mt-2 text-[11px] text-white/40">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">RPC</label>
                <select className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white">
                  <option>Solana Testnet</option>
                  <option>Solana Devnet</option>
                  <option>Solana Mainnet</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Execution Mode</label>
                <select className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white">
                  <option>Sequential (DAG)</option>
                  <option>Parallel (Group)</option>
                  <option>Hybrid (AI Optimized)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-[10px] font-mono text-white/40">0x402 payment payloads will be auto-attached.</div>
              <button className="px-4 py-2 rounded-xl bg-[#00FFE5] text-black font-mono text-xs font-semibold hover:bg-[#0ef2dc]">
                Deploy Workflow
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
