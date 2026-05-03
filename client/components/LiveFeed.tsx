'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMarketplaceFeed } from '@/hooks/useMarketplaceFeed';
import { truncateAddress } from '@/lib/stellar';
import type { MarketplaceActivityEvent } from '@/types/events';

const TYPE_STYLES: Record<MarketplaceActivityEvent['eventType'], string> = {
  agent_run: 'text-[#111111]',
  payment_received: 'text-[#799ee0]',
  new_agent: 'text-black/50',
};

const TYPE_BADGES: Record<MarketplaceActivityEvent['eventType'], string> = {
  agent_run: 'bg-black/5 border-black/10 text-black/60',
  payment_received: 'bg-[#799ee0]/10 border-[#799ee0]/30 text-[#799ee0]',
  new_agent: 'bg-black/5 border-black/10 text-black/50',
};

function formatEventLabel(ev: MarketplaceActivityEvent): string {
  if (ev.eventType === 'new_agent') return 'new_agent';
  if (ev.eventType === 'payment_received') return 'payment_received';
  return 'agent_run';
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.valueOf())) return '--:--:--';
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export default function LiveFeed() {
  const { events, isConnected } = useMarketplaceFeed({ maxEvents: 12 });

  return (
    <div className="rounded-[20px] border border-black/10 bg-white shadow-[0_15px_40px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-[#fafafa]">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#799ee0] animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-sans font-medium text-sm text-[#111111]">Live Activity</span>
          <span className="font-mono text-[10px] text-black/30 ml-2 hidden sm:inline">ably://marketplace</span>
        </div>
        <span className="font-mono text-[10px] text-black/40 uppercase tracking-wider">{isConnected ? 'connected' : 'connecting'} · 0x402 · Solana</span>
      </div>

      {/* Feed rows */}
      <div className="divide-y divide-black/5">
        {events.length === 0 && (
          <div className="px-6 py-8 text-center font-sans text-sm text-black/40">No activity yet. Run an agent request to see realtime events.</div>
        )}
        <AnimatePresence initial={false}>
          {events.map((ev, idx) => (
            <motion.div
              key={`${ev.timestamp}-${ev.agentId}-${idx}`}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1,  y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4 px-6 py-4 hover:bg-[#fafafa] transition-colors"
            >
              {/* Badge */}
              <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${TYPE_BADGES[ev.eventType]}`}>
                {ev.eventType.replace('_', '\u00A0')}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className={`font-mono text-[13px] font-semibold tracking-tight ${TYPE_STYLES[ev.eventType]}`}>
                    {formatEventLabel(ev)}
                  </span>
                  {typeof ev.priceXlm === 'number' && ev.priceXlm > 0 && (
                    <span className="font-mono text-[11px] font-medium text-[#799ee0]">
                      +{ev.priceXlm.toFixed(2)} SOL
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-black/50">
                    {ev.agentName} ({ev.agentId.slice(0, 8)}...)
                  </span>
                  <span className="text-black/20">·</span>
                  <span className="font-mono text-[11px] text-black/50">
                    wallet:{truncateAddress(ev.callerWallet || ev.ownerWallet, 5)}
                  </span>
                  <span className="text-black/20">·</span>
                  <span className="font-mono text-[11px] text-black/40">{formatTime(ev.timestamp)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
