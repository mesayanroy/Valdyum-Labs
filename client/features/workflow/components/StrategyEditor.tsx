'use client';

import Editor from '@monaco-editor/react';

export default function StrategyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[#120c08] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-syne text-sm font-semibold text-white">Strategy Code</h3>
        <span className="font-mono text-[10px] text-[#cbb38b]">monaco · typescript</span>
      </div>
      <div className="h-[260px]">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange(val ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            padding: { top: 12 },
            scrollbar: { verticalScrollbarSize: 6 },
          }}
        />
      </div>
    </div>
  );
}
