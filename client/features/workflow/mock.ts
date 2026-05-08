import type { WorkflowNode } from './types';

type AppendLog = (entry: { level: 'info' | 'warn' | 'error' | 'success'; message: string; nodeId?: string }) => void;
type UpdateNode = (nodeId: string, updater: (data: any) => any) => void;

const mockEvents = [
  'Jupiter quote fetched: SOL/USDC spread 0.42%',
  'Helius webhook received for 2 pending swaps',
  'Pyth oracle update: SOL/USD 150.21',
  '0x402 payment auth queued (nonce: 0x7d91...)',
  'Jito bundle confirmed in slot 214559922',
  'Trust layer score updated +2.1',
  'CLI runtime heartbeat OK',
];

export function startMockStreams(nodes: WorkflowNode[], appendLog: AppendLog, updateNode: UpdateNode) {
  const interval = setInterval(() => {
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    const message = mockEvents[Math.floor(Math.random() * mockEvents.length)];
    appendLog({ level: 'info', message, nodeId: node?.id });
    if (node) {
      updateNode(node.id, (data) => ({
        ...data,
        latencyMs: Math.round(100 + Math.random() * 900),
        throughput: `${(Math.random() * 3 + 0.5).toFixed(2)} ops/s`,
      }));
    }
  }, 3200);

  return () => clearInterval(interval);
}
