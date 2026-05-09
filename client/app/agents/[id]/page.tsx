'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Agent } from '@/types';
import TerminalOutput from '@/components/TerminalOutput';
import PaymentModal from '@/components/PaymentModal';
import { truncateAddress } from '@/lib/solana';
import { useMarketplaceFeed } from '@/hooks/useMarketplaceFeed';
import { tokenConfig, tokenMetadataLabel } from '@/lib/token';

type RuntimeInfo = {
  agent_id: string;
  owner_wallet: string;
  api_endpoint: string | null;
  api_key: string | null;
  model: string;
  visibility: string;
};

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentChallenge, setPaymentChallenge] = useState<{
    memo: string;
    address: string;
    amountSol: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [lastSignerWallet, setLastSignerWallet] = useState<string | null>(null);
  const [lastBilledSol, setLastBilledSol] = useState<number>(0);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerWallet, setViewerWallet] = useState<string>('');
  const [accessGranted, setAccessGranted] = useState(false);

  const agentId = Array.isArray(id) ? id[0] : id ?? '';

  useEffect(() => {
    setViewerWallet(localStorage.getItem('wallet_address') || '');
  }, []);

  useEffect(() => {
    const fetchAgent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          setAgent(data);
          setCustomPrompt(String(data.system_prompt || ''));
          setCustomTags(Array.isArray(data.tags) ? data.tags.join(', ') : '');
          setCustomEndpoint(String(data.api_endpoint || ''));
        } else if (res.status === 404) {
          setNotFound(true);
        } else {
          setError('Failed to load agent details.');
        }
      } catch {
        setError('Failed to load agent details.');
      } finally {
        setLoading(false);
      }
    };
    if (agentId) fetchAgent();
  }, [agentId]);

  const runAgent = async (txHash?: string, signerWallet?: string) => {
    setRunning(true);
    setError(null);
    try {
      const walletAddress = signerWallet || localStorage.getItem('wallet_address');
      if (walletAddress) setLastSignerWallet(walletAddress);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (txHash) {
        headers['X-Payment-Tx-Hash'] = txHash;
        if (walletAddress) headers['X-Payment-Wallet'] = walletAddress;
      }

      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input,
          customization: {
            prompt: customPrompt,
            tags: customTags.split(',').map((t) => t.trim()).filter(Boolean),
            api_endpoint: customEndpoint,
          },
        }),
      });

      const data = await res.json() as any;

      if (res.status === 402 || data?.paymentRequired) {
        if (data?.payment_details?.memo && data?.payment_details?.address) {
          setPaymentChallenge({
            memo: data.payment_details.memo,
            address: data.payment_details.address,
            amountSol: Number(data.payment_details.amount_sol ?? agent?.price_sol ?? 0),
          });
        }
        setPaymentApproved(false);
        setPaymentModal(true);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Request failed');

      let finalOutput = String(data.output || '');
      if (txHash || Number(agent?.price_sol) === 0) {
        setAccessGranted(true);
        finalOutput += "\n\n[SYSTEM] Transaction Verified. Gateway link established. You can now access the agent credentials below.";
      }

      setOutput(finalOutput);
      setLastBilledSol(Number(data.billed_sol || 0));
      setRuntimeInfo(data.runtime || null);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  };

  const removeAgent = async () => {
    if (!agent || deleting) return;
    const walletAddress = localStorage.getItem('wallet_address') || '';
    if (!walletAddress || walletAddress !== agent.owner_wallet) return;
    if (!window.confirm(`Remove agent "${agent.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/agents/${agent.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress }) });
      router.push('/dashboard');
    } catch (err: any) { setError(err.message); } finally { setDeleting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono">Loading agent...</div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center font-cinzel text-xl">Agent Not Found</div>;
  if (!agent) return null;

  const manifest = {
    agent_id: agent.id,
    name: agent.name,
    model: agent.model,
    system_prompt: agent.system_prompt,
    api_endpoint: `https://valdyum-labs.com/api/agents/${agent.id}/run`,
    config: { protocol: '0x402', pricing: `${agent.price_sol} SOL/req`, version: '1.2.0' }
  };

  const cliCode = `npx valdyum-cli run ${agent.id} --input "Hello" --wallet <YOUR_WALLET>`;
  
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f7f0e3] relative overflow-hidden font-serif">
      <div className="pointer-events-none absolute inset-0 bg-[url('/background/slide33.png')] bg-cover bg-center opacity-15" />
      
      <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-10">
            <div>
              <h1 className="font-cinzel text-5xl font-bold text-white tracking-widest uppercase">{agent.name}</h1>
              <p className="text-[#cbb38b] mt-3 italic tracking-wide">"ID: {agent.id.slice(0, 8)} | Praetorian Grade Class"</p>
            </div>
            <div className="text-right">
              <div className="text-[#d4af37] font-cinzel font-bold text-4xl">{agent.price_sol} <span className="text-sm opacity-60">SOL</span></div>
              <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mt-1">Imperial Fee per Decree</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              
              {/* Command Console */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-6">
                   <h3 className="font-cinzel text-xl font-bold text-white uppercase tracking-[0.2em]">Imperial Command Console</h3>
                   <div className="flex gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600/60 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                   </div>
                </div>
                <div className="border border-[rgba(212,175,55,0.4)] rounded-[3rem] bg-[rgba(27,18,12,0.6)] backdrop-blur-xl p-10 shadow-3xl">
                   <div className="flex flex-col gap-6">
                      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter decree for this Praetorian..." rows={3} className="w-full px-6 py-4 border border-white/10 rounded-2xl bg-black/60 text-white text-base focus:outline-none focus:border-[#d4af37]/40 font-serif" />
                      <div className="flex justify-between items-center">
                         <div className="text-[10px] font-mono text-gray-500 uppercase">Neural link encrypted via Valdyum Proxy</div>
                         <button onClick={() => runAgent()} disabled={running || !input} className="px-12 py-4 bg-[#d4af37] text-black font-cinzel font-bold text-lg rounded-2xl hover:bg-[#f5e7d1] transition-all shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                           {running ? 'Executing...' : `Run (${agent.price_sol} SOL)`}
                         </button>
                      </div>
                   </div>
                   {error && <div className="mt-6 p-4 rounded-xl border border-red-900/40 bg-red-900/10 text-red-400 text-xs font-mono">{error}</div>}
                   {output && (
                     <div className="mt-10 animate-in fade-in slide-in-from-bottom-4">
                       <TerminalOutput content={output} title="praetorian_response.txt" language="txt" />
                     </div>
                   )}
                </div>

                {/* API ACCESS SECTION - GATED */}
                <AnimatePresence>
                  {accessGranted && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-10 p-8 rounded-[2.5rem] border border-[rgba(212,175,55,0.3)] bg-black/40 backdrop-blur-md shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                       <h3 className="font-cinzel text-lg font-bold text-[#d4af37] mb-8 uppercase tracking-widest">Imperial Gateway Access</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                             <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Dedicated Agent API Key</label>
                             <div className="relative group">
                                <input readOnly value={agent.api_key || 'UNIFIED_VALDYUM_KEY'} className="w-full px-5 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-[#4ade80] outline-none" />
                                <button onClick={() => navigator.clipboard.writeText(agent.api_key || 'UNIFIED_VALDYUM_KEY')} className="absolute right-3 top-2.5 text-[10px] font-mono text-[#d4af37] uppercase opacity-0 group-hover:opacity-100 transition-all hover:underline">Copy</button>
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Neural Endpoint</label>
                             <div className="relative group">
                                <input readOnly value={`https://valdyum-labs.com/api/agents/${agent.id}/run`} className="w-full px-5 py-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-white outline-none" />
                                <button onClick={() => navigator.clipboard.writeText(`https://valdyum-labs.com/api/agents/${agent.id}/run`)} className="absolute right-3 top-2.5 text-[10px] font-mono text-[#d4af37] uppercase opacity-0 group-hover:opacity-100 transition-all hover:underline">Copy</button>
                             </div>
                          </div>
                       </div>
                       
                       <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="block text-[10px] font-mono text-gray-500 uppercase">CLI Command Tool</label>
                             <div className="p-4 rounded-xl bg-black border border-white/5 font-mono text-[10px] text-white/80 leading-relaxed">
                                <code>{cliCode}</code>
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="block text-[10px] font-mono text-gray-500 uppercase">Unit Manifest (JSON)</label>
                             <div className="p-4 rounded-xl bg-black border border-white/5 font-mono text-[10px] text-[#d4af37] max-h-[80px] overflow-y-auto custom-scrollbar">
                                <pre>{JSON.stringify(manifest, null, 2)}</pre>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className="p-8 border border-white/10 rounded-[2.5rem] bg-black/40 backdrop-blur-md">
                <h3 className="font-cinzel text-xl font-bold text-white mb-6 uppercase tracking-widest">Neural Directives</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Primary Consciousness</label>
                    <div className="text-sm text-gray-300 italic leading-relaxed">"{agent.system_prompt}"</div>
                  </div>
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase"><span>Model Architecture</span> <span className="text-white">{agent.model}</span></div>
                    <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase"><span>Ownership</span> <span className="text-white truncate max-w-[120px]">{truncateAddress(agent.owner_wallet)}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-8 border border-[#d4af37]/20 rounded-[2.5rem] bg-gradient-to-br from-[#d4af37]/5 to-transparent shadow-xl">
                 <h4 className="font-cinzel text-xs font-bold text-[#d4af37] mb-6 uppercase tracking-widest">Unit Performance</h4>
                 <div className="space-y-4 font-mono text-[10px] uppercase text-gray-500">
                    <div className="flex justify-between"><span>Success Rate</span> <span className="text-[#4ade80]">99.8%</span></div>
                    <div className="flex justify-between"><span>Total Requests</span> <span className="text-white">{agent.total_requests}</span></div>
                    <div className="flex justify-between"><span>Registry</span> <span className="text-blue-400">VALIDATED</span></div>
                 </div>
                 {viewerWallet === agent.owner_wallet && (
                   <button onClick={removeAgent} disabled={deleting} className="w-full mt-8 py-3 border border-red-900/40 text-red-500 rounded-xl text-[9px] font-mono uppercase hover:bg-red-900/10 transition-all">Deactivate Unit</button>
                 )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <PaymentModal
        isOpen={paymentModal}
        onClose={() => { setPaymentModal(false); setPaymentApproved(false); }}
        agentId={agent.anchor_contract_id || agent.id}
        agentName={agent.name}
        priceSol={paymentChallenge?.amountSol ?? agent.price_sol}
        ownerAddress={paymentChallenge?.address ?? agent.owner_wallet}
        paymentMemo={paymentChallenge?.memo ?? `agent:${agent.id}`}
        onPaymentSuccess={(txHash, signerWallet) => {
          setPaymentModal(false);
          setPaymentApproved(true);
          runAgent(txHash, signerWallet);
        }}
      />

      <style jsx global>{`
        .shadow-3xl { box-shadow: 0 0 120px -30px rgba(212, 175, 55, 0.25); }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
