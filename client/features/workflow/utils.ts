import type { WorkflowEdge, WorkflowNode, WorkflowNodeData, WorkflowNodeKind } from './types';
import { tokenConfig } from '@/lib/token';

const baseParams: Record<WorkflowNodeKind, Record<string, string>> = {
  jupiter_swap: { slippage: '0.3%', pair: 'SOL/USDC' },
  jito_bundle: { bundleTip: '0.0002 SOL', priority: 'high' },
  helius_webhook: { endpoint: '/api/webhooks/helius' },
  pyth_oracle: { feed: 'SOL/USD', freshness: '1s' },
  agent_memory: { retention: '24h', vectorDb: 'supabase' },
  ai_decision: { model: 'claude-3.5-sonnet', temperature: '0.2' },
  arbitrage_detector: { threshold: '0.5%', venues: 'Orca,Raydium' },
  trust_layer: { policy: 'T504', risk: 'medium' },
  x402_payment: { amount: '0.05', asset: tokenConfig.symbol, network: `solana:${tokenConfig.network}` },
  wallet: { address: 'wallet.solana', role: 'signer' },
  solana_rpc: { rpc: 'https://api.testnet.solana.com', commitment: 'confirmed' },
  websocket_stream: { channel: 'price-stream', provider: 'Ably' },
  cli_runtime: { mode: 'local', binary: 'valdyum' },
  sandbox: { cluster: 'devnet', replay: 'enabled' },
  token_faucet: { amount: '5', asset: tokenConfig.symbol },
  risk_manager: { maxDrawdown: '8%', mode: 'adaptive' },
  strategy_trigger: { schedule: 'on_price_move', window: '5m' },
};

const nodeLabels: Record<WorkflowNodeKind, string> = {
  jupiter_swap: 'Jupiter Swap',
  jito_bundle: 'Jito Bundle',
  helius_webhook: 'Helius Webhook',
  pyth_oracle: 'Pyth Oracle',
  agent_memory: 'Agent Memory',
  ai_decision: 'AI Decision',
  arbitrage_detector: 'Arbitrage Detector',
  trust_layer: 'Trust Layer (T504)',
  x402_payment: '0x402 Payment',
  wallet: 'Wallet Node',
  solana_rpc: 'Solana RPC',
  websocket_stream: 'WebSocket Stream',
  cli_runtime: 'CLI Runtime',
  sandbox: 'Sandbox',
  token_faucet: 'Token Faucet',
  risk_manager: 'Risk Manager',
  strategy_trigger: 'Strategy Trigger',
};

export const nodeCatalog = (Object.keys(nodeLabels) as WorkflowNodeKind[]).map((kind) => ({
  kind,
  label: nodeLabels[kind],
  description: baseParams[kind] ? Object.values(baseParams[kind]).join(' · ') : '',
}));

export const buildWorkflowNode = (kind: WorkflowNodeKind, overrides?: Partial<WorkflowNode>): WorkflowNode => {
  const data: WorkflowNodeData = {
    label: nodeLabels[kind],
    kind,
    status: 'idle',
    latencyMs: undefined,
    throughput: '0 ops/s',
    params: { ...baseParams[kind] },
    logs: [],
  };

  return {
    id: overrides?.id ?? `${kind}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'workflowNode',
    position: overrides?.position ?? { x: Math.random() * 400 + 200, y: Math.random() * 300 + 120 },
    data,
    ...overrides,
  };
};

export const buildInitialNodes = (): WorkflowNode[] => [
  buildWorkflowNode('strategy_trigger', { id: 'strategy_trigger', position: { x: 0, y: 120 } }),
  buildWorkflowNode('pyth_oracle', { id: 'pyth_oracle', position: { x: 260, y: 40 } }),
  buildWorkflowNode('ai_decision', { id: 'ai_decision', position: { x: 520, y: 120 } }),
  buildWorkflowNode('jupiter_swap', { id: 'jupiter_swap', position: { x: 760, y: 80 } }),
  buildWorkflowNode('jito_bundle', { id: 'jito_bundle', position: { x: 1020, y: 140 } }),
  buildWorkflowNode('x402_payment', { id: 'x402_payment', position: { x: 1280, y: 80 } }),
  buildWorkflowNode('trust_layer', { id: 'trust_layer', position: { x: 1520, y: 160 } }),
  buildWorkflowNode('wallet', { id: 'wallet', position: { x: 1020, y: 320 } }),
  buildWorkflowNode('cli_runtime', { id: 'cli_runtime', position: { x: 520, y: 300 } }),
  buildWorkflowNode('sandbox', { id: 'sandbox', position: { x: 260, y: 260 } }),
];

export const buildInitialEdges = (): WorkflowEdge[] => [
  { id: 'e1', source: 'strategy_trigger', target: 'pyth_oracle', animated: true },
  { id: 'e2', source: 'pyth_oracle', target: 'ai_decision', animated: true },
  { id: 'e3', source: 'ai_decision', target: 'jupiter_swap', animated: true },
  { id: 'e4', source: 'jupiter_swap', target: 'jito_bundle', animated: true },
  { id: 'e5', source: 'jito_bundle', target: 'x402_payment', animated: true },
  { id: 'e6', source: 'x402_payment', target: 'trust_layer', animated: true },
  { id: 'e7', source: 'ai_decision', target: 'cli_runtime', animated: true },
];

export const createWorkflowId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
