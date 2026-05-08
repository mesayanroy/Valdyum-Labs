'use client';

import type { WorkflowMarketplaceItem } from '../types';

const demoStrategies: WorkflowMarketplaceItem[] = [
  { id: 'arb-01', name: 'SOL Arbitrage Loop', trustScore: 92, version: 'v2.1', tags: ['arbitrage', 'jupiter'], updatedAt: '2h ago' },
  { id: 'mev-02', name: 'MEV Sprint Bundle', trustScore: 88, version: 'v1.6', tags: ['jito', 'bundle'], updatedAt: '1d ago' },
  { id: 'liq-03', name: 'Liquidation Guard', trustScore: 79, version: 'v1.2', tags: ['risk', 'pyth'], updatedAt: '3d ago' },
];

export default function MarketplacePanel() {
  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(20,13,9,0.85)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-syne text-sm font-semibold text-white">Strategy Marketplace</h3>
        <span className="font-mono text-[10px] text-[#cbb38b]">public · forkable</span>
      </div>
      <div className="space-y-3">
        {demoStrategies.map((strategy) => (
          <div key={strategy.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-white">{strategy.name}</div>
              <span className="text-[10px] font-mono text-[#d4af37]">{strategy.trustScore}%</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {strategy.tags.map((tag) => (
                <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-[#cbb38b]">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-[#cbb38b]">
              <span>{strategy.version}</span>
              <span>{strategy.updatedAt}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-lg border border-[#d4af37]/60 text-[#d4af37] text-[10px] font-mono py-1 hover:bg-[rgba(212,175,55,0.12)]">
                Fork
              </button>
              <button className="flex-1 rounded-lg border border-white/10 text-white/50 text-[10px] font-mono py-1 hover:text-white">
                Deploy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
