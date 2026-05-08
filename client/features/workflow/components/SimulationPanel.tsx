'use client';

export default function SimulationPanel({
  simulationMode,
  onToggle,
}: {
  simulationMode: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(20,13,9,0.85)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-syne text-sm font-semibold text-white">Simulation Sandbox</h3>
        <button
          onClick={() => onToggle(!simulationMode)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono border ${
            simulationMode ? 'border-[#d4af37]/60 text-[#d4af37]' : 'border-white/20 text-white/40'
          }`}
        >
          {simulationMode ? 'DEVNET' : 'PAUSED'}
        </button>
      </div>
      <div className="space-y-2 text-[11px] font-mono text-white/50">
        <div className="flex items-center justify-between">
          <span>Replay Transactions</span>
          <span className="text-[#00FFE5]">enabled</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Token Faucet</span>
          <span className="text-[#FFB800]">5,000 / day</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Execution Mode</span>
          <span>Simulation DAG</span>
        </div>
      </div>
      <button className="w-full rounded-lg bg-[#d4af37] text-black text-[11px] font-mono py-2 font-semibold hover:bg-[#c69b2f]">
        Run Simulation
      </button>
    </div>
  );
}
