'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { nodeTypes } from '@/features/workflow/nodes';
import { useWorkflowStore } from '@/features/workflow/store';
import { runExecution } from '@/features/workflow/engine';
import { startMockStreams } from '@/features/workflow/mock';
import {
  DeploymentModal,
  GpuDashboard,
  MarketplacePanel,
  NodePalette,
  SimulationPanel,
  StrategyEditor,
  TerminalPanel,
} from '@/features/workflow/components';
import { tokenConfig } from '@/lib/token';

const buildDefaultStrategy = (symbol: string) => `// Valdyum Workflow Strategy\n// Example: Trigger -> Oracle -> AI Decision -> Jupiter -> Jito -> 0x402 -> Trust\n\nexport async function execute(context) {\n  const { priceFeed, execution } = context;\n  if (priceFeed.spread > 0.5) {\n    await execution.swap('${symbol}', 'USDC', { slippage: 0.003 });\n    await execution.bundle({ tip: 0.0002 });\n    await execution.pay402({ amount: 0.05 });\n  }\n}\n`;

export default function WorkflowPage() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const terminalLines = useWorkflowStore((state) => state.terminalLines);
  const execution = useWorkflowStore((state) => state.execution);
  const simulationMode = useWorkflowStore((state) => state.simulationMode);
  const deploymentOpen = useWorkflowStore((state) => state.deploymentOpen);

  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);
  const connect = useWorkflowStore((state) => state.connect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const appendLog = useWorkflowStore((state) => state.appendLog);
  const setSimulationMode = useWorkflowStore((state) => state.setSimulationMode);
  const setExecution = useWorkflowStore((state) => state.setExecution);
  const toggleDeployment = useWorkflowStore((state) => state.toggleDeployment);
  const resetExecution = useWorkflowStore((state) => state.resetExecution);

  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0],
    [nodes, selectedNodeId],
  );

  const [strategyCode, setStrategyCode] = useState(() => buildDefaultStrategy(tokenConfig.symbol));

  useEffect(() => {
    const cleanup = startMockStreams(nodes, appendLog, updateNode);
    return cleanup;
  }, [appendLog, updateNode, nodes]);

  const handleRun = async () => {
    resetExecution();
    await runExecution(nodes, edges, updateNode, appendLog, setExecution);
  };

  return (
    <div className="min-h-screen bg-[#120b07] text-[#f7f0e3] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('/background/slide33.png')] bg-cover bg-center opacity-10" />
      <div className="px-6 pt-8 pb-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="font-syne text-3xl font-bold text-[#f5e7d1]">Valdyum Workflow</h1>
              <p className="font-mono text-xs text-[#cbb38b]">
                Design, simulate, and deploy autonomous Solana agent pipelines with 0x402-native payments.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRun}
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-black font-mono text-xs font-semibold hover:bg-[#c69b2f]"
              >
                Run Simulation
              </button>
              <button
                onClick={() => toggleDeployment(true)}
                className="px-4 py-2 rounded-xl border border-[rgba(212,175,55,0.5)] text-[#f5e7d1] font-mono text-xs hover:border-[#d4af37]"
              >
                Deploy Workflow
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-white/40">
            <span className="px-2 py-1 rounded-full border border-[rgba(212,175,55,0.35)] text-[#cbb38b]">Execution: {execution.status}</span>
            <span className="px-2 py-1 rounded-full border border-[rgba(212,175,55,0.35)] text-[#cbb38b]">Mode: {simulationMode ? 'Simulation' : 'Live'} </span>
            <span className="px-2 py-1 rounded-full border border-[rgba(212,175,55,0.35)] text-[#cbb38b]">Nodes: {nodes.length}</span>
            <span className="px-2 py-1 rounded-full border border-[rgba(212,175,55,0.35)] text-[#cbb38b]">Edges: {edges.length}</span>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px] gap-4 relative z-10">
        <div className="space-y-4">
          <NodePalette onAdd={addNode} />
          <MarketplacePanel />
          <SimulationPanel simulationMode={simulationMode} onToggle={setSimulationMode} />
          <GpuDashboard />
        </div>

        <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(20,13,9,0.7)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="font-mono text-[11px] text-white/70">Imperium Canvas</div>
            <div className="font-mono text-[10px] text-[#cbb38b]">pan · zoom · snap</div>
          </div>
          <div className="h-[620px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onConnect={connect}
              onNodeClick={(_, node) => selectNode(node.id)}
              nodeTypes={nodeTypes}
              fitView
              panOnScroll
              snapToGrid
              snapGrid={[16, 16]}
              selectionOnDrag
              defaultEdgeOptions={{ animated: true, style: { stroke: '#d4af37' } }}
            >
              <Background gap={32} size={1} color="rgba(255,255,255,0.08)" />
              <MiniMap pannable zoomable className="bg-black/60" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(20,13,9,0.85)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-syne text-sm font-semibold">Node Inspector</h3>
              <span className="font-mono text-[10px] text-white/40">{selectedNode?.data.label}</span>
            </div>
            {selectedNode && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#cbb38b]">
                    <span>Status</span>
                    <span className="text-[#d4af37]">{selectedNode.data.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#cbb38b] mt-1">
                    <span>Latency</span>
                    <span>{selectedNode.data.latencyMs ? `${selectedNode.data.latencyMs} ms` : '--'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(selectedNode.data.params).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-mono text-[#cbb38b] uppercase tracking-widest mb-1">{key}</label>
                      <input
                        value={value}
                        onChange={(event) =>
                          updateNode(selectedNode.id, (data) => ({
                            ...data,
                            params: { ...data.params, [key]: event.target.value },
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#cbb38b] uppercase tracking-widest mb-1">Live Logs</label>
                  <div className="rounded-lg border border-white/10 bg-black/40 p-2 text-[10px] font-mono text-white/60 space-y-1 max-h-[120px] overflow-y-auto">
                    {selectedNode.data.logs.length === 0 && <div>No logs yet.</div>}
                    {selectedNode.data.logs.map((log, idx) => (
                      <div key={`${selectedNode.id}-log-${idx}`}>{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <StrategyEditor value={strategyCode} onChange={setStrategyCode} />
        </div>
      </div>

      <div className="px-6 pb-8 relative z-10">
        <TerminalPanel logs={terminalLines} />
      </div>

      <DeploymentModal open={deploymentOpen} onClose={() => toggleDeployment(false)} />
    </div>
  );
}
