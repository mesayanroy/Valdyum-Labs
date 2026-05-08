'use client';

import { Handle, Position } from 'reactflow';
import type { WorkflowNodeData } from '../types';

const statusColor: Record<WorkflowNodeData['status'], string> = {
  idle: 'border-white/10 text-[#cbb38b]',
  running: 'border-[#d4af37]/70 text-[#d4af37]',
  success: 'border-[#4ade80]/60 text-[#4ade80]',
  error: 'border-[#f87171]/60 text-[#f87171]',
};

export default function WorkflowNode({ data }: { data: WorkflowNodeData }) {
  return (
    <div className={`rounded-2xl border bg-[rgba(20,13,9,0.92)] px-4 py-3 min-w-[190px] shadow-[0_0_18px_rgba(212,175,55,0.12)] ${statusColor[data.status]}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-syne text-sm font-semibold">{data.label}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">{data.kind.replace('_', ' ')}</div>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/50">
          {data.status}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-[10px] font-mono text-white/50">
        <div className="flex items-center justify-between">
          <span>Latency</span>
          <span>{data.latencyMs ? `${data.latencyMs} ms` : '--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Throughput</span>
          <span>{data.throughput ?? '0 ops/s'}</span>
        </div>
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="flex flex-wrap gap-1">
          {Object.entries(data.params).slice(0, 3).map(([key, value]) => (
            <span
              key={key}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/50 bg-white/5"
            >
              {key}:{value}
            </span>
          ))}
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#d4af37]" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#b86b4b]" />
    </div>
  );
}
