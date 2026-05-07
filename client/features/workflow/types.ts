import type { Node, Edge } from 'reactflow';

export type WorkflowNodeStatus = 'idle' | 'running' | 'success' | 'error';

export type WorkflowLogLevel = 'info' | 'warn' | 'error' | 'success';

export type WorkflowNodeKind =
  | 'jupiter_swap'
  | 'jito_bundle'
  | 'helius_webhook'
  | 'pyth_oracle'
  | 'agent_memory'
  | 'ai_decision'
  | 'arbitrage_detector'
  | 'trust_layer'
  | 'x402_payment'
  | 'wallet'
  | 'solana_rpc'
  | 'websocket_stream'
  | 'cli_runtime'
  | 'sandbox'
  | 'token_faucet'
  | 'risk_manager'
  | 'strategy_trigger';

export interface WorkflowLogEntry {
  id: string;
  timestamp: string;
  level: WorkflowLogLevel;
  message: string;
  nodeId?: string;
}

export interface WorkflowNodeData {
  label: string;
  kind: WorkflowNodeKind;
  status: WorkflowNodeStatus;
  latencyMs?: number;
  throughput?: string;
  params: Record<string, string>;
  logs: string[];
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export interface WorkflowExecutionState {
  status: 'idle' | 'running' | 'success' | 'error';
  lastRunAt?: string;
  durationMs?: number;
  error?: string;
}

export interface WorkflowMarketplaceItem {
  id: string;
  name: string;
  trustScore: number;
  version: string;
  tags: string[];
  updatedAt: string;
}
