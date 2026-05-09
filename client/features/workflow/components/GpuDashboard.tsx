'use client';

const metrics = [
  { label: 'GPU Usage', value: '62%', color: 'text-[#d4af37]' },
  { label: 'Memory Pressure', value: '4.2 GB', color: 'text-[#FFB800]' },
  { label: 'Compute Efficiency', value: '91%', color: 'text-[#4ade80]' },
  { label: 'Runtime Stability', value: '99.2%', color: 'text-purple-400' },
];

export default function GpuDashboard() {
  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(20,13,9,0.85)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel text-sm font-semibold text-white">GPU Optimization</h3>
        <span className="font-mono text-[10px] text-[#cbb38b]">Metal · ROCm · CUDA</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className={`font-cinzel text-lg ${metric.color}`}>{metric.value}</div>
            <div className="font-mono text-[10px] text-white/50">{metric.label}</div>
          </div>
        ))}
      </div>
      <button className="w-full rounded-lg border border-[#d4af37]/30 py-1.5 font-mono text-[10px] text-[#d4af37] hover:bg-[#d4af37]/10 transition-all">
        Optimize Mars Runtime
      </button>
    </div>
  );
}
