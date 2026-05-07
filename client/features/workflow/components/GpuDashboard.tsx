'use client';

const metrics = [
  { label: 'GPU Usage', value: '62%', color: 'text-[#00FFE5]' },
  { label: 'Memory Pressure', value: '4.2 GB', color: 'text-[#FFB800]' },
  { label: 'Compute Efficiency', value: '91%', color: 'text-[#4ade80]' },
  { label: 'Runtime Stability', value: '99.2%', color: 'text-purple-400' },
];

export default function GpuDashboard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(10,10,16,0.85)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-syne text-sm font-semibold text-white">GPU Optimization</h3>
        <span className="font-mono text-[10px] text-white/40">Metal · ROCm · CUDA</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className={`font-syne text-lg ${metric.color}`}>{metric.value}</div>
            <div className="font-mono text-[10px] text-white/50">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
