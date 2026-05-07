'use client';

import { nodeCatalog } from '../nodes';
import type { WorkflowNodeKind } from '../types';

export default function NodePalette({ onAdd }: { onAdd: (kind: WorkflowNodeKind) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(10,10,16,0.8)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-syne text-sm font-semibold text-white">Node Library</h3>
        <span className="font-mono text-[10px] text-white/40">drag · add</span>
      </div>
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {nodeCatalog.map((node) => (
          <button
            key={node.kind}
            onClick={() => onAdd(node.kind)}
            className="w-full text-left rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:border-[#00FFE5]/50 hover:bg-[rgba(0,255,229,0.08)] transition-colors"
          >
            <div className="font-mono text-xs text-white">{node.label}</div>
            <div className="font-mono text-[10px] text-white/40">{node.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
