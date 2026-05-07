'use client';

export default function SimulationPanel({
  simulationMode,
  onToggle,
}: {
  simulationMode: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(10,10,16,0.85)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-syne text-sm font-semibold text-white">Simulation Sandbox</h3>
        <button
          onClick={() => onToggle(!simulationMode)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono border ${
            simulationMode ? 'border-[#4ade80]/60 text-[#4ade80]' : 'border-white/20 text-white/40'
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
      <button className="w-full rounded-lg bg-[#00FFE5] text-black text-[11px] font-mono py-2 font-semibold hover:bg-[#0ef2dc]">
        Run Simulation
      </button>
    </div>
  );
}
