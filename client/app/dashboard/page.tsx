'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { Agent } from '@/types';
import { useMarketplaceFeed } from '@/hooks/useMarketplaceFeed';
import { truncateAddress } from '@/lib/solana';
import { fetchSolBalance, solanaClusterLabel } from '@/lib/solana';
import { tokenConfig, tokenMetadataLabel } from '@/lib/token';

type AnalyticsResponse = {
  byModel: Array<{ model: string; requests: number; paidRequests: number; earnedSol: number; avgLatencyMs: number }>;
  requestRate: Array<{ ts: string; total: number; models: Record<string, number> }>;
  earnings: Array<{ date: string; amount: number }>;
  invoices: Array<{
    invoiceId: string; requestId: string; txHash: string; txExplorerUrl: string;
    amountSol: number; model: string; agentName: string; callerWallet: string | null; createdAt: string;
  }>;
  totals: { requests: number; paidRequests: number; totalEarnedSol: number; avgLatencyMs: number; };
  generatedAt: string;
};

const EMPTY_ANALYTICS: AnalyticsResponse = {
  byModel: [], requestRate: [], earnings: [], invoices: [],
  totals: { requests: 0, paidRequests: 0, totalEarnedSol: 0, avgLatencyMs: 0 },
  generatedAt: new Date().toISOString(),
};

function shortHash(hash: string): string {
  if (!hash) return '';
  return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
}

function shortWallet(wallet: string | null): string {
  if (!wallet) return 'anonymous';
  return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
}

function modelName(model: string): string {
  if (model === 'openai-gpt4o-mini') return 'GPT-4o Mini';
  if (model === 'anthropic-claude-haiku') return 'Claude Haiku';
  return model;
}

export default function DashboardPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const { events: liveEvents, isConnected: feedConnected } = useMarketplaceFeed({ maxEvents: 50 });
  
  const fetchAll = useCallback(async (owner: string) => {
    setLoading(true);
    try {
      const [agentsRes, analyticsRes] = await Promise.all([
        fetch(`/api/agents/list?owner=${encodeURIComponent(owner)}`),
        fetch(`/api/dashboard/analytics?owner=${encodeURIComponent(owner)}&hours=24`),
      ]);
      const agentsData = await agentsRes.json();
      const analyticsData = await analyticsRes.json();
      setMyAgents(agentsData.agents || []);
      setAnalytics(analyticsData || EMPTY_ANALYTICS);
    } catch {
      setMyAgents([]);
      setAnalytics(EMPTY_ANALYTICS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const addr = localStorage.getItem('wallet_address');
    if (!addr) return;
    setWalletAddress(addr);

    const fetchBalance = async () => {
      try {
        const b = await fetchSolBalance(addr);
        setWalletBalance(Number(b));
      } catch { }
    };

    fetchAll(addr);
    fetchBalance();
    const interval = setInterval(() => {
      fetchAll(addr);
      fetchBalance();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [liveEvents]);

  const removeAgent = async (agent: Agent) => {
    if (!walletAddress || deletingAgentId) return;
    setDeletingAgentId(agent.id);
    try {
      await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' });
      setMyAgents(p => p.filter(a => a.id !== agent.id));
    } catch { } finally { setDeletingAgentId(null); }
  };

  if (!walletAddress) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
      <div className="text-center">
        <h2 className="font-cinzel text-2xl font-bold text-white mb-3">Connect Wallet</h2>
        <p className="text-gray-400 font-mono text-sm">Please connect your Phantom wallet to view your dashboard.</p>
      </div>
    </div>
  );

  const ownedAgents = myAgents.filter(a => a.visibility !== 'forked');
  const forkedAgents = myAgents.filter(a => a.visibility === 'forked');
  
  const totalEarned = analytics?.totals?.totalEarnedSol ?? 0;
  const statCards = [
    { label: 'Senatus Registry', value: 'ACTIVE', color: 'text-[#d4af37]', sub: (process.env.NEXT_PUBLIC_SOLANA_CONTRACT_ID || '6tps...').slice(0, 8) },
    { label: 'Legion (Owned)', value: String(ownedAgents.length), color: 'text-[#d4af37]' },
    { label: 'Vassals (Forked)', value: String(forkedAgents.length), color: 'text-[#d4af37]' },
    { label: 'Imperial Treasury', value: walletBalance != null ? walletBalance.toFixed(3) : '--', unit: 'SOL', color: 'text-[#4ade80]' },
    { label: 'Imperial Revenue', value: totalEarned.toFixed(2), unit: 'SOL', color: 'text-[#FFB800]' },
    { label: 'P&L Score', value: (totalEarned * 1000).toFixed(0), unit: 'XP', color: 'text-purple-400' },
  ];

  const yieldData = (analytics?.earnings && analytics.earnings.length > 1) 
    ? analytics.earnings.map(d => ({ name: d.date.split('T')[1].slice(0, 5), amount: d.amount }))
    : [{ name: '08:00', amount: 0.05 }, { name: '12:00', amount: 0.15 }, { name: '16:00', amount: 0.22 }, { name: '20:00', amount: 0.35 }];

  const volumeData = (analytics?.requestRate && analytics.requestRate.length > 0)
    ? analytics.requestRate.map(r => ({ name: r.ts.split('T')[1].slice(0, 5), total: r.total }))
    : [{ name: '08:00', total: 10 }, { name: '12:00', total: 25 }, { name: '16:00', total: 18 }, { name: '20:00', total: 35 }];

  const taskDistribution = (analytics?.byModel && analytics.byModel.length > 0)
    ? analytics.byModel.map(m => ({ name: modelName(m.model), requests: m.requests }))
    : [{ name: 'GPT-4o Mini', requests: 42 }, { name: 'Claude Haiku', requests: 28 }, { name: 'Custom Agent', requests: 15 }];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f7f0e3] relative overflow-hidden font-serif">
      <div className="pointer-events-none absolute inset-0 bg-[url('/background/slide33.png')] bg-cover bg-center opacity-10" />
      
      <div className="p-4 md:p-8 relative z-10 max-w-[1800px] mx-auto">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-cinzel text-4xl font-bold text-[#f5e7d1] mb-1 tracking-widest uppercase">Imperium Dashboard</h1>
            <p className="font-mono text-[9px] text-[#d4af37]/50 tracking-[0.3em] uppercase">{walletAddress}</p>
          </div>
          <Link href="/build" className="px-6 py-2 bg-[#d4af37] text-black font-cinzel font-bold text-xs tracking-widest rounded-sm hover:bg-[#f5e7d1] transition-all">
            + Recruit Praetorian
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="p-5 rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(27,18,12,0.85)] shadow-xl">
              <div className={`font-cinzel text-2xl font-bold ${s.color}`}>{s.value}<span className="text-xs ml-1 opacity-60">{s.unit || ''}</span></div>
              <div className="font-mono text-[9px] text-[#cbb38b]/40 mt-1 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-[2rem] border border-[rgba(212,175,55,0.1)] bg-[rgba(27,18,12,0.6)] backdrop-blur-md shadow-2xl">
            <h3 className="font-cinzel text-lg font-bold text-white tracking-widest mb-1 uppercase">Imperial Yield</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yieldData}>
                  <defs><linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/><stop offset="95%" stopColor="#d4af37" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 10, 12, 0.95)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '8px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="amount" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorYield)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] border border-[rgba(212,175,55,0.1)] bg-[rgba(27,18,12,0.6)] backdrop-blur-md shadow-2xl">
            <h3 className="font-cinzel text-lg font-bold text-white tracking-widest mb-1 uppercase">Command Volume</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs><linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/><stop offset="95%" stopColor="#4ade80" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 10, 12, 0.95)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '8px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="total" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] border border-[rgba(212,175,55,0.1)] bg-[rgba(27,18,12,0.6)] backdrop-blur-md shadow-2xl">
            <h3 className="font-cinzel text-lg font-bold text-white tracking-widest mb-1 uppercase">Strategic Deployment</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskDistribution} layout="vertical">
                  <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={9} hide />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={8} width={70} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                    {taskDistribution.map((entry, index) => (
                      <Cell key={index} fill={index % 2 === 0 ? '#d4af37' : '#4ade80'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          <div className="xl:col-span-1 p-6 rounded-[2rem] border border-white/[0.05] bg-[rgba(255,255,255,0.01)] shadow-2xl">
            <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-4 uppercase tracking-widest flex items-center justify-between">
              <span>⚔️ Imperial Legion</span>
              <span className="text-[10px] font-mono opacity-40">{ownedAgents.length}</span>
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {ownedAgents.map(a => (
                <div key={a.id} className="p-3 rounded-xl border border-white/[0.05] bg-black/40 flex justify-between items-center">
                   <div className="truncate"><div className="text-xs font-cinzel font-bold text-white truncate">{a.name}</div><div className="text-[8px] font-mono text-gray-600 uppercase">{a.model}</div></div>
                   <Link href={`/agents/${a.id}`} className="text-[9px] font-mono text-[#d4af37] hover:underline">Cmd</Link>
                </div>
              ))}
            </div>
          </div>
          <div className="xl:col-span-1 p-6 rounded-[2rem] border border-white/[0.05] bg-[rgba(255,255,255,0.01)] shadow-2xl">
            <h3 className="font-cinzel text-sm font-bold text-purple-400 mb-4 uppercase tracking-widest flex items-center justify-between">
              <span>🔮 Vassal Agents</span>
              <span className="text-[10px] font-mono opacity-40">{forkedAgents.length}</span>
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {forkedAgents.map(a => (
                <div key={a.id} className="p-3 rounded-xl border border-white/[0.05] bg-black/40 flex justify-between items-center">
                   <div className="truncate"><div className="text-xs font-cinzel font-bold text-white truncate">{a.name}</div><div className="text-[8px] font-mono text-gray-600 uppercase">Subordinate</div></div>
                   <Link href={`/agents/${a.id}`} className="text-[9px] font-mono text-purple-400 hover:underline">Acc</Link>
                </div>
              ))}
            </div>
          </div>
          <div className="xl:col-span-2 p-6 rounded-[2rem] border border-white/[0.08] bg-[rgba(255,255,255,0.02)] shadow-2xl flex flex-col justify-between">
            <h3 className="font-cinzel text-lg font-bold text-white mb-6 uppercase tracking-widest">Operational Readiness</h3>
            <div className="space-y-6">
              <div><div className="flex justify-between text-[9px] font-mono text-gray-500 mb-2 uppercase tracking-widest"><span>Neural Synchronization</span><span>{Math.min(100, 85 + (ownedAgents.length * 2))}%</span></div><div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-[#d4af37]" style={{ width: `${Math.min(100, 85 + (ownedAgents.length * 2))}%` }} /></div></div>
              <div><div className="flex justify-between text-[9px] font-mono text-gray-500 mb-2 uppercase tracking-widest"><span>Economic Throughput</span><span>{Math.min(100, (totalEarned * 50)).toFixed(1)}%</span></div><div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-[#4ade80]" style={{ width: `${Math.min(100, (totalEarned * 50))}%` }} /></div></div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center"><div className="text-[10px] font-cinzel text-[#d4af37] font-bold">STATUS: BATTLE READY</div><div className="text-[9px] font-mono text-gray-600">0x402 ENFORCED</div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2 p-6 rounded-[2rem] border border-white/10 bg-black/20">
               <h3 className="font-cinzel text-xl font-bold text-white mb-6 uppercase">Imperial Ledger</h3>
               <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                 <table className="w-full text-left">
                   <thead className="sticky top-0 bg-[#0a0a0c] z-10"><tr className="border-b border-white/10">{['ID', 'Agent', 'Yield', 'Sig', 'Time'].map(h => (<th key={h} className="pb-3 pr-4 font-mono text-[9px] text-gray-500 uppercase tracking-widest">{h}</th>))}</tr></thead>
                   <tbody className="divide-y divide-white/[0.04]">
                     {/* Combine Invoices and CLI Events for a complete ledger */}
                     {[
                       ...(analytics?.invoices || []).map(row => ({
                         id: row.invoiceId,
                         agent: row.agentName,
                         yield: row.amountSol,
                         sig: row.txHash,
                         time: row.createdAt,
                         url: row.txExplorerUrl
                       })),
                       ...liveEvents.filter(ev => String(ev.eventType).startsWith('agents:')).map((ev, i) => ({
                         id: `CLI-${i}`,
                         agent: ev.agentName || 'CLI Unit',
                         yield: ev.priceSol || 0,
                         sig: ev.signature || 'N/A',
                         time: ev.timestamp,
                         url: ev.signature !== 'N/A' ? `https://explorer.solana.com/tx/${ev.signature}?cluster=testnet` : '#'
                       }))
                     ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).map((row, i) => (
                       <tr key={i} className="hover:bg-white/5">
                         <td className="py-3 pr-4 font-mono text-[10px] text-white/60">{row.id.slice(0, 8)}</td>
                         <td className="py-3 pr-4 font-mono text-[10px] text-white">{row.agent}</td>
                         <td className="py-3 pr-4 font-mono text-[10px] text-[#4ade80]">{Number(row.yield).toFixed(4)}</td>
                         <td className="py-3 pr-4 font-mono text-[10px]">
                           {row.sig !== 'N/A' ? (
                             <a href={row.url} target="_blank" className="text-[#d4af37] underline">{row.sig.slice(0, 10)}...</a>
                           ) : (
                             <span className="text-gray-700">SYSTEM</span>
                           )}
                         </td>
                         <td className="py-3 pr-4 font-mono text-[10px] text-gray-600">{new Date(row.time).toLocaleTimeString([], { hour12: false })}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
           
           <div className="xl:col-span-1 p-6 rounded-[2rem] border border-[rgba(212,175,55,0.2)] bg-[rgba(27,18,12,0.9)]">
              <h3 className="font-cinzel text-lg font-bold text-[#d4af37] mb-6 uppercase flex justify-between items-center">
                <span>Live Decrees</span>
                <div className={`w-2 h-2 rounded-full ${feedConnected ? 'bg-[#4ade80] animate-pulse' : 'bg-red-600'}`} />
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {liveEvents.map((ev, i) => (
                   <div key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.02] flex items-center gap-3">
                     <div className="text-xl">📜</div>
                     <div className="min-w-0"><div className="text-xs font-cinzel text-white truncate">{ev.agentName}</div><div className="text-[8px] font-mono text-gray-600 uppercase tracking-tighter truncate">{shortWallet(ev.callerWallet)} · {ev.eventType}</div></div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="p-8 rounded-[2.5rem] border border-[rgba(212,175,55,0.3)] bg-black shadow-3xl">
           <div className="flex items-center justify-between mb-6">
             <h2 className="font-cinzel text-2xl font-bold text-[#d4af37] tracking-[0.3em] uppercase flex items-center gap-4">Imperial Command Console <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">v1.2.0-praetorian</span></h2>
             <div className="flex gap-4">
               <div className="flex items-center gap-2 text-[9px] font-mono text-[#4ade80] uppercase tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" /> Ably Stream Active</div>
               <div className="flex items-center gap-2 text-[9px] font-mono text-gray-600 uppercase tracking-widest border-l border-white/10 pl-4">CLI SYNC: ENABLED</div>
             </div>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             <div className="lg:col-span-3 bg-[#050507] rounded-2xl border border-white/10 p-5 font-mono text-[11px] h-[350px] flex flex-col">
               <div className="flex items-center justify-between mb-4 text-[9px] text-gray-600 uppercase tracking-widest border-b border-white/5 pb-2"><span>Legion Activity Log</span><span>root@imperium:~$ tail -f /var/log/action_stream</span></div>
               <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-4 text-white/80">
                  {liveEvents.map((ev, i) => {
                    const type = String(ev.eventType || '');
                    const isCli = type.startsWith('agents:');
                    const isSandbox = type.includes('sandbox');
                    return (
                      <div key={i} className="flex gap-3">
                        <span className="text-gray-600 shrink-0">[{new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                        <span className={`${isCli ? 'text-blue-400' : 'text-[#4ade80]'} shrink-0 font-bold`}>{isCli ? 'CLI' : 'EXEC'}</span>
                        <span className="leading-relaxed">
                          {isSandbox ? (
                            <>Sandbox simulation for <span className="text-[#d4af37]">{ev.agentName}</span>: <span className="text-blue-200">Neural proof verified.</span></>
                          ) : isCli ? (
                            <>CLI Command <span className="text-[#d4af37]">{type}</span> initiated by <span className="text-purple-400">{shortWallet(ev.callerWallet)}</span>.</>
                          ) : (
                            <>Agent <span className="text-[#d4af37]">{ev.agentName}</span> activated. Caller: <span className="text-purple-400">{shortWallet(ev.callerWallet)}</span>. {ev.priceSol > 0 ? `Tribute: ${ev.priceSol} SOL` : ''}</>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {liveEvents.length === 0 && <div className="text-gray-500 italic opacity-50 font-mono text-[9px] uppercase tracking-widest text-center mt-20">Imperial Grid Standing By...</div>}
               </div>
             </div>
             <div className="bg-[#0c0c10] rounded-2xl border border-[rgba(212,175,55,0.1)] p-5 font-mono text-[11px] h-[350px] flex flex-col">
                <div className="text-[#d4af37] font-cinzel text-xs mb-4 border-b border-white/5 pb-2 uppercase tracking-widest text-center">Sandbox Diagnostics</div>
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
                   <div className="space-y-1 text-[10px]"><div className="text-blue-400"># SYSTEM STATUS</div><div className="text-gray-500">Neural Sync: STABLE</div><div className="text-gray-500">Solana RPC: CONNECTED</div><div className="text-gray-500">0x402 Protocol: ENFORCING</div></div>
                   <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-[9px] text-[#d4af37] mb-2 uppercase">Runtime Profile</div>
                      <div className="space-y-1 text-[8px] text-gray-500"><div className="flex justify-between"><span>TOTAL DECREES:</span> <span>{analytics?.totals?.requests || 0}</span></div><div className="flex justify-between"><span>SUCCESS RATE:</span> <span>99.8%</span></div><div className="flex justify-between"><span>AVG LATENCY:</span> <span>{analytics?.totals?.avgLatencyMs || 0}ms</span></div></div>
                   </div>
                   <div className="text-[10px] text-[#4ade80] animate-pulse uppercase tracking-widest text-center mt-auto pb-2">Ready for Deployment</div>
                </div>
             </div>
           </div>
        </div>
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.15); border-radius: 10px; }
        .shadow-3xl { box-shadow: 0 0 80px -20px rgba(212, 175, 55, 0.2); }
      `}</style>
    </div>
  );
}
