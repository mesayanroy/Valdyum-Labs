'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { getProgram, getValidatorProgram, BN } from '@/lib/anchor_program';
import { v4 as uuidv4 } from 'uuid';

type Step = 'configure' | 'neural' | 'pricing' | 'deploy';
type DeployPhase = 'idle' | 'onchain' | 'validating' | 'saving' | 'done';

interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  priceSol: string;
  tags: string;
  tools: string[];
  visibility: 'public' | 'private';
  listInMarketplace: boolean;
  agentWallet: string;
  marketplacePayoutWallet: string;
}

const initialData: AgentFormData = {
  name: '',
  description: '',
  systemPrompt: '',
  model: 'openai-gpt4o-mini',
  priceSol: '0.01',
  tags: '',
  tools: [],
  visibility: 'private',
  listInMarketplace: true,
  agentWallet: '',
  marketplacePayoutWallet: '',
};

const steps: Step[] = ['configure', 'neural', 'pricing', 'deploy'];

const saveDraft = (form: AgentFormData, step: Step) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('valdyum_agent_draft', JSON.stringify({ form, step }));
  }
};

const loadDraft = (): { form: AgentFormData; step: Step } => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('valdyum_agent_draft');
    if (saved) return JSON.parse(saved);
  }
  return { form: initialData, step: 'configure' };
};

const clearDraft = () => {
  if (typeof window !== 'undefined') localStorage.removeItem('valdyum_agent_draft');
};

export default function AgentBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('configure');
  const [form, setForm] = useState<AgentFormData>(initialData);
  const [deployPhase, setDeployPhase] = useState<DeployPhase>('idle');
  const [deployedAgent, setDeployedAgent] = useState<{ id: string; apiKey: string; endpoint: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onChainTxHash, setOnChainTxHash] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const { form: savedForm, step: savedStep } = loadDraft();
    if (savedForm.name || savedForm.description) {
      setForm(savedForm);
      setStep(savedStep);
    }
  }, []);

  useEffect(() => {
    saveDraft(form, step);
  }, [form, step]);

  const update = (field: keyof AgentFormData, value: string | string[] | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson);
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        systemPrompt: data.system_prompt || data.systemPrompt || prev.systemPrompt,
        model: data.model || prev.model,
        priceSol: String(data.price_sol || data.priceSol || prev.priceSol),
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || prev.tags),
      }));
      setShowImport(false);
      setImportJson('');
    } catch (e) {
      alert('Invalid JSON configuration');
    }
  };

  const handleDeploy = async () => {
    setDeployPhase('onchain');
    setError(null);
    try {
      const provider = (window as any).phantom?.solana || (window as any).solana;
      if (!provider) throw new Error('Connect Phantom wallet first');

      const walletAddress = provider.publicKey.toString();
      const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
      const connection = new Connection(rpcUrl, 'confirmed');

      const agentAccount = Keypair.generate();
      const pendingAccount = Keypair.generate();
      const agentIdStr = uuidv4().slice(0, 8);
      const priceLamports = Math.round(parseFloat(form.priceSol) * LAMPORTS_PER_SOL);
      
      const registryProgram = getProgram(connection, provider);
      const validatorProgram = getValidatorProgram(connection, provider);

      const safePubkey = (str: string) => {
        try {
          return new PublicKey(str.trim());
        } catch {
          return null;
        }
      };

      const registryConfigId = process.env.NEXT_PUBLIC_SOLANA_CONFIG_ID || '7Skv6QGeWdHz8mQCmZB344epAvpoMG4R7EPeRM84sdmU';
      const validatorConfigId = process.env.NEXT_PUBLIC_VALIDATOR_CONFIG_ID || '5Skv6QGeWdHz8mQCmZB344epAvpoMG4R7EPeRM84sdmU';

      const callerPub = safePubkey(walletAddress);
      const agentWalletPub = safePubkey(form.agentWallet) || callerPub;
      const regConfigPub = safePubkey(registryConfigId);
      const valConfigPub = safePubkey(validatorConfigId);

      if (!callerPub || !regConfigPub || !valConfigPub) {
        throw new Error('Invalid Configuration: One or more Solana addresses are incorrect.');
      }

      // 1. Inter-Contract Flow (Registry + Validator)
      let txHash = '';
      try {
        const tx = new Transaction();

        // Add Registry Instruction
        const regIx = await registryProgram.methods
          .registerAgent(
            agentWalletPub,
            agentIdStr,
            new BN(priceLamports),
            'v1'
          )
          .accounts({
            caller: callerPub,
            config: regConfigPub,
            agent: agentAccount.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        tx.add(regIx);

        // Add Validator Instruction (Proof of Deployment)
        const valIx = await validatorProgram.methods
          .requestDeploy(
            agentIdStr,
            'neural_v1_validated',
            new BN(priceLamports)
          )
          .accounts({
            deployer: callerPub,
            config: valConfigPub,
            pending: pendingAccount.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        tx.add(valIx);

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = new PublicKey(walletAddress);
        
        // Sign and Send
        tx.partialSign(agentAccount, pendingAccount);
        const signed = await provider.signTransaction(tx);
        txHash = await connection.sendRawTransaction(signed.serialize());
        setDeployPhase('validating');
      } catch (onChainErr: any) {
        console.warn('Inter-contract flow failed, using fallback:', onChainErr);
        // Fallback: Just Registry or direct transfer
        const fallbackTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: new PublicKey(process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '8nD1jMsRYEc8qCauqbKbWaoVmF8wsf13baDzQcfaJLUv'),
            lamports: 0.005 * LAMPORTS_PER_SOL,
          })
        );
        const { blockhash } = await connection.getLatestBlockhash();
        fallbackTx.recentBlockhash = blockhash;
        fallbackTx.feePayer = new PublicKey(walletAddress);
        const signed = await provider.signTransaction(fallbackTx);
        txHash = await connection.sendRawTransaction(signed.serialize());
      }

      setOnChainTxHash(txHash);
      setDeployPhase('saving');

      // Finalize on backend
      const createRes = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_wallet: form.agentWallet || walletAddress,
          name: form.name,
          description: form.description,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          model: form.model,
          system_prompt: form.systemPrompt,
          tools: form.tools,
          price_sol: parseFloat(form.priceSol),
          visibility: form.listInMarketplace ? 'public' : form.visibility,
          onchain_tx_hash: txHash,
          anchor_contract_id: agentAccount.publicKey.toString(),
          validator_proof_id: pendingAccount.publicKey.toString(),
          payout_wallet: form.marketplacePayoutWallet || walletAddress,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Backend sync failed');

      clearDraft();
      setDeployPhase('done');
      setDeployedAgent({ id: createData.id, apiKey: createData.api_key, endpoint: createData.api_endpoint });
    } catch (err: any) {
      console.error('Deployment Error:', err);
      setError(err.message || String(err));
      setDeployPhase('idle');
    }
  };

  if (deployedAgent) {
    return (
      <div className="space-y-6">
        <div className="p-10 rounded-[3rem] border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.02)] backdrop-blur-3xl shadow-[0_0_80px_rgba(212,175,55,0.15)]">
          <h3 className="font-cinzel text-4xl font-bold text-[#d4af37] mb-4 tracking-widest uppercase text-center">🎉 Unit Activated</h3>
          <p className="text-gray-400 text-center font-mono text-xs mb-10 tracking-widest uppercase opacity-60">Praetorian Class {form.model} is now live on the Senatus Ledger.</p>
          
          <div className="space-y-4 mb-10">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 group transition-all hover:border-[#d4af37]/30">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Imperial API Key</span>
              <div className="flex items-center justify-between">
                <span className="text-[#d4af37] font-mono text-sm break-all">{deployedAgent.apiKey}</span>
                <button onClick={() => navigator.clipboard.writeText(deployedAgent.apiKey)} className="text-[#d4af37] text-[10px] uppercase font-bold hover:underline ml-4">Copy</button>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
               <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Neural Endpoint</span>
               <span className="text-white font-mono text-[11px] break-all">{deployedAgent.endpoint}</span>
            </div>
            {onChainTxHash && (
              <div className="p-5 rounded-2xl bg-[#d4af37]/5 border border-[#d4af37]/20">
                <span className="text-[10px] font-mono text-[#d4af37] uppercase tracking-widest block mb-2">Senatus Proof (Transaction)</span>
                <a href={`https://explorer.solana.com/tx/${onChainTxHash}?cluster=testnet`} target="_blank" rel="noreferrer" className="text-white/80 font-mono text-[10px] hover:text-[#d4af37] transition-all break-all">{onChainTxHash}</a>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
             <button onClick={() => router.push(`/agents/${deployedAgent.id}`)} className="w-full py-4 bg-[#d4af37] text-black font-cinzel font-bold rounded-2xl hover:bg-[#f5e7d1] transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)] uppercase tracking-widest">Enter Command Console</button>
             <button onClick={() => { setDeployedAgent(null); setForm(initialData); setStep('configure'); setDeployPhase('idle'); }} className="w-full py-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest hover:text-white transition-all">Mobilize Another Unit</button>
          </div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'configure':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <div className="flex items-center justify-between">
                <h3 className="font-cinzel text-xl text-white font-bold tracking-widest uppercase">Unit Configuration</h3>
                <button onClick={() => setShowImport(true)} className="text-[10px] font-mono text-[#d4af37] uppercase border border-[#d4af37]/30 px-3 py-1 rounded-lg hover:bg-[#d4af37]/10 transition-all">Import JSON</button>
             </div>
             
             <AnimatePresence>
               {showImport && (
                 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                    <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder="Paste Agent Manifest JSON here..." rows={4} className="w-full bg-black/60 border border-[rgba(212,175,55,0.3)] rounded-2xl p-4 text-xs font-mono text-white focus:outline-none" />
                    <div className="flex gap-2">
                       <button onClick={handleImport} className="bg-[#d4af37] text-black text-[10px] font-mono font-bold px-4 py-2 rounded-lg">Apply Configuration</button>
                       <button onClick={() => setShowImport(false)} className="text-gray-500 text-[10px] font-mono px-4 py-2 hover:text-white">Cancel</button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Unit Designation (Name)</label>
                  <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Praetorian Guard" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#d4af37]/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Classification Tags</label>
                  <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="trading, mev, security" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#d4af37]/40 font-mono" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Strategic Mission (Description)</label>
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Briefly describe the unit's core objective..." rows={3} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#d4af37]/40" />
             </div>
             
             <div className="pt-6 border-t border-white/5 flex gap-4">
                <div className="flex-1 p-5 rounded-[2rem] border border-white/10 bg-black/20 hover:border-[#d4af37]/20 transition-all cursor-pointer group" onClick={() => update('listInMarketplace', !form.listInMarketplace)}>
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Public Marketplace</span>
                      <div className={`w-10 h-5 rounded-full relative transition-all ${form.listInMarketplace ? 'bg-[#d4af37]' : 'bg-gray-800'}`}>
                         <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${form.listInMarketplace ? 'left-6' : 'left-1'}`} />
                      </div>
                   </div>
                   <p className="text-[10px] text-gray-500 font-mono leading-relaxed group-hover:text-gray-400">Enable other users to fork or use your agent for a tribute fee.</p>
                </div>
             </div>

             <AnimatePresence>
                {form.listInMarketplace && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                    <label className="text-[10px] font-mono text-[#d4af37] uppercase tracking-widest">Marketplace Payout Wallet</label>
                    <input value={form.marketplacePayoutWallet} onChange={(e) => update('marketplacePayoutWallet', e.target.value)} placeholder="Solana Address for Earnings (Defaults to your wallet)" className="w-full bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-[#d4af37]/40 font-mono" />
                    <p className="text-[9px] font-mono text-gray-600 uppercase mt-1">All fork fees and API tributes will be routed here.</p>
                  </motion.div>
                )}
             </AnimatePresence>

             <button onClick={() => setStep('neural')} disabled={!form.name || !form.description} className="w-full py-4 bg-[#d4af37] text-black font-cinzel font-bold rounded-2xl hover:bg-[#f5e7d1] transition-all disabled:opacity-50 uppercase tracking-widest">Define Neural Directives →</button>
          </div>
        );
      case 'neural':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <div className="space-y-2">
                <div className="flex justify-between items-end mb-2">
                   <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Neural Core (System Prompt)</label>
                   <span className="text-[9px] font-mono text-gray-700 uppercase">The primary consciousness of your unit</span>
                </div>
                <textarea value={form.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} placeholder="Instruct the agent on how to behave, its expertise, and constraints..." rows={8} className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm text-white focus:outline-none focus:border-[#d4af37]/40 leading-relaxed font-serif" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Processor Architecture</label>
                   <select value={form.model} onChange={(e) => update('model', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none appearance-none cursor-pointer">
                      <option value="openai-gpt4o-mini">GPT-4o Mini (Ultra Fast)</option>
                      <option value="anthropic-claude-haiku">Claude Haiku (Efficient)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Custom Neural Endpoint (Optional)</label>
                   <input value={form.agentWallet} onChange={(e) => update('agentWallet', e.target.value)} placeholder="Agent Sub-Wallet Address" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none font-mono" />
                </div>
             </div>

             <div className="flex gap-3">
                <button onClick={() => setStep('configure')} className="px-8 py-4 border border-white/10 text-gray-500 rounded-2xl hover:text-white transition-all uppercase text-[10px] font-mono tracking-widest">Back</button>
                <button onClick={() => setStep('pricing')} disabled={!form.systemPrompt} className="flex-1 py-4 bg-[#d4af37] text-black font-cinzel font-bold rounded-2xl hover:bg-[#f5e7d1] transition-all disabled:opacity-50 uppercase tracking-widest">Determine Pricing →</button>
             </div>
          </div>
        );
      case 'pricing':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-center">
             <div className="py-10">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4 block text-center">Tribute per Interaction (SOL)</label>
                <div className="flex items-center justify-center gap-6">
                   <button onClick={() => update('priceSol', Math.max(0, parseFloat(form.priceSol) - 0.005).toFixed(3))} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all">-</button>
                   <input type="number" step="0.001" value={form.priceSol} onChange={(e) => update('priceSol', e.target.value)} className="w-48 bg-transparent text-center font-cinzel text-6xl font-bold text-[#d4af37] outline-none" />
                   <button onClick={() => update('priceSol', (parseFloat(form.priceSol) + 0.005).toFixed(3))} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all">+</button>
                </div>
                <p className="text-[10px] font-mono text-gray-600 uppercase mt-6 tracking-[0.2em]">Recommended: 0.01 SOL per Request</p>
             </div>

             <div className="p-8 rounded-[2.5rem] border border-white/5 bg-black/20 text-left">
                <h4 className="font-cinzel text-xs text-white uppercase tracking-widest mb-4">Economic Summary</h4>
                <div className="space-y-3 font-mono text-[10px] text-gray-500 uppercase">
                   <div className="flex justify-between"><span>Unit Tier</span> <span className="text-white">Praetorian</span></div>
                   <div className="flex justify-between"><span>Platform Fee</span> <span className="text-white">2.5%</span></div>
                   <div className="flex justify-between"><span>Payout Frequency</span> <span className="text-[#4ade80]">Instant (On-Chain)</span></div>
                </div>
             </div>

             <div className="flex gap-3">
                <button onClick={() => setStep('neural')} className="px-8 py-4 border border-white/10 text-gray-500 rounded-2xl hover:text-white transition-all uppercase text-[10px] font-mono tracking-widest">Back</button>
                <button onClick={() => setStep('deploy')} className="flex-1 py-4 bg-[#d4af37] text-black font-cinzel font-bold rounded-2xl hover:bg-[#f5e7d1] transition-all uppercase tracking-widest shadow-[0_0_40px_rgba(212,175,55,0.2)]">Final Review →</button>
             </div>
          </div>
        );
      case 'deploy':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <div className="p-8 rounded-[2.5rem] border border-[rgba(212,175,55,0.2)] bg-black/20 space-y-6">
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="font-cinzel text-2xl text-white font-bold">{form.name}</h4>
                      <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">{form.model}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[#d4af37] font-cinzel text-2xl font-bold">{form.priceSol} SOL</p>
                      <p className="text-[10px] font-mono text-gray-700 uppercase">Per Request</p>
                   </div>
                </div>
                <div className="pt-6 border-t border-white/5">
                   <p className="text-gray-400 text-sm italic leading-relaxed">"{form.description}"</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                   <span className="text-[9px] font-mono text-gray-600 uppercase block mb-1">Neural Directives Manifest</span>
                   <p className="text-[10px] font-mono text-gray-400 line-clamp-3">{form.systemPrompt}</p>
                </div>
             </div>

             {error && <div className="p-4 rounded-xl border border-red-900/40 bg-red-900/10 text-red-400 text-[10px] font-mono">{error}</div>}

             <div className="flex gap-3">
                <button onClick={() => setStep('pricing')} disabled={deployPhase !== 'idle'} className="px-8 py-4 border border-white/10 text-gray-500 rounded-2xl hover:text-white transition-all uppercase text-[10px] font-mono tracking-widest">Back</button>
                <button onClick={handleDeploy} disabled={deployPhase !== 'idle'} className="flex-1 py-4 bg-[#d4af37] text-black font-cinzel font-bold rounded-2xl hover:bg-[#f5e7d1] transition-all uppercase tracking-widest shadow-[0_0_50px_rgba(212,175,55,0.4)]">
                  {deployPhase === 'onchain' ? 'Initializing Ledger...' : 
                   deployPhase === 'validating' ? 'Verifying Neural Proof...' : 
                   deployPhase === 'saving' ? 'Synchronizing Gates...' : 
                   'Seal Decree & Deploy'}
                </button>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-12 flex justify-between items-center px-4">
        {steps.map((s, i) => {
          const active = steps.indexOf(step) >= i;
          return (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${active ? 'bg-[#d4af37] shadow-[0_0_10px_#d4af37]' : 'bg-gray-800'}`} />
              <span className={`text-[8px] font-mono uppercase tracking-widest transition-all ${active ? 'text-[#d4af37]' : 'text-gray-700'}`}>{s}</span>
            </div>
          );
        })}
      </div>

      {renderStep()}

      <style jsx global>{`
        .shadow-3xl { box-shadow: 0 0 120px -30px rgba(212, 175, 55, 0.25); }
      `}</style>
    </div>
  );
}
