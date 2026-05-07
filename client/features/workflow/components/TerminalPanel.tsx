'use client';

import { useState } from 'react';
import type { WorkflowLogEntry } from '../types';

const levelStyles: Record<WorkflowLogEntry['level'], string> = {
  info: 'text-[#00FFE5]',
  warn: 'text-[#FFB800]',
  error: 'text-red-400',
  success: 'text-[#4ade80]',
};

export default function TerminalPanel({ logs }: { logs: WorkflowLogEntry[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`rounded-2xl border border-white/10 bg-[#070710] overflow-hidden ${open ? 'max-h-[320px]' : 'max-h-[56px]'} transition-all duration-300`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FF4545]" />
            <div className="w-2 h-2 rounded-full bg-[#FFB800]" />
            <div className="w-2 h-2 rounded-full bg-[#00FFE5]" />
          </div>
          <span className="font-mono text-[10px] text-white/50">live-terminal.log</span>
        </div>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="text-[10px] font-mono text-white/50 hover:text-white"
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {open && (
        <div className="max-h-[260px] overflow-y-auto px-4 py-3 space-y-2 font-mono text-[11px]">
          {logs.length === 0 && <div className="text-white/30">Waiting for execution logs...</div>}
          {logs.map((line) => (
            <div key={line.id} className="flex items-start gap-2">
              <span className="text-white/30">{new Date(line.timestamp).toLocaleTimeString([], { hour12: false })}</span>
              <span className={`${levelStyles[line.level]} uppercase`}>[{line.level}]</span>
              <span className="text-white/70">{line.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
