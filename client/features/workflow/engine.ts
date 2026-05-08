import type { WorkflowEdge, WorkflowNode, WorkflowNodeStatus } from './types';

type UpdateNode = (id: string, updater: (data: any) => any) => void;
type AppendLog = (entry: { level: 'info' | 'warn' | 'error' | 'success'; message: string; nodeId?: string }) => void;
type SetExecution = (patch: { status?: 'idle' | 'running' | 'success' | 'error'; durationMs?: number; error?: string; lastRunAt?: string }) => void;

function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();

  nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incomingCount.set(node.id, 0);
  });

  edges.forEach((edge) => {
    if (!edge.source || !edge.target) return;
    outgoing.get(edge.source)?.push(edge.target);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
  });

  return { outgoing, incomingCount };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runExecution(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  updateNode: UpdateNode,
  appendLog: AppendLog,
  setExecution: SetExecution,
) {
  const start = Date.now();
  const maxRetries = 2;
  setExecution({ status: 'running', lastRunAt: new Date().toISOString(), error: undefined });
  appendLog({ level: 'info', message: 'Simulation started: building execution graph.' });

  const { outgoing, incomingCount } = buildGraph(nodes, edges);
  const queue = nodes.filter((node) => (incomingCount.get(node.id) || 0) === 0).map((node) => node.id);
  const executed = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    updateNode(nodeId, (data) => ({ ...data, status: 'running' as WorkflowNodeStatus }));
    appendLog({ level: 'info', message: `Executing ${node.data.label}`, nodeId });

    let attempt = 0;
    let success = false;
    while (attempt <= maxRetries && !success) {
      attempt += 1;
      await sleep(400 + Math.random() * 700);
      const shouldFail = Math.random() < 0.08;
      if (!shouldFail) {
        success = true;
        const latency = Math.round(120 + Math.random() * 680);
        updateNode(nodeId, (data) => ({
          ...data,
          status: 'success' as WorkflowNodeStatus,
          latencyMs: latency,
          throughput: `${(Math.random() * 2 + 0.2).toFixed(2)} ops/s`,
          logs: [`Executed in ${latency}ms`, `attempt ${attempt}/${maxRetries + 1}`, ...data.logs].slice(0, 5),
        }));
        appendLog({ level: 'success', message: `${node.data.label} completed in ${latency}ms`, nodeId });
      } else if (attempt <= maxRetries) {
        appendLog({ level: 'warn', message: `${node.data.label} failed, retrying (${attempt}/${maxRetries})`, nodeId });
      }
    }

    if (!success) {
      updateNode(nodeId, (data) => ({ ...data, status: 'error' as WorkflowNodeStatus }));
      const errorMessage = `${node.data.label} failed after ${maxRetries + 1} attempts`;
      appendLog({ level: 'error', message: errorMessage, nodeId });
      setExecution({ status: 'error', error: errorMessage });
      return;
    }

    executed.add(nodeId);
    for (const target of outgoing.get(nodeId) || []) {
      incomingCount.set(target, Math.max(0, (incomingCount.get(target) || 0) - 1));
      if ((incomingCount.get(target) || 0) === 0) {
        queue.push(target);
      }
    }
  }

  const duration = Date.now() - start;
  setExecution({ status: 'success', durationMs: duration });
  appendLog({ level: 'success', message: `Simulation finished in ${duration}ms.` });
}
