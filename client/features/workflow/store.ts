import { create } from 'zustand';
import { applyEdgeChanges, applyNodeChanges, type NodeChange, type EdgeChange, type Connection, addEdge } from 'reactflow';
import type {
  WorkflowEdge,
  WorkflowExecutionState,
  WorkflowLogEntry,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowNodeKind,
} from './types';
import { buildInitialEdges, buildInitialNodes, buildWorkflowNode, createWorkflowId } from './utils';

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  terminalLines: WorkflowLogEntry[];
  execution: WorkflowExecutionState;
  simulationMode: boolean;
  deploymentOpen: boolean;
  setNodes: (changes: NodeChange[]) => void;
  setEdges: (changes: EdgeChange[]) => void;
  connect: (connection: Connection) => void;
  addNode: (kind: WorkflowNodeKind) => void;
  selectNode: (nodeId: string | null) => void;
  updateNode: (nodeId: string, updater: (data: WorkflowNodeData) => WorkflowNodeData) => void;
  appendLog: (entry: Omit<WorkflowLogEntry, 'id' | 'timestamp'>) => void;
  setSimulationMode: (value: boolean) => void;
  setExecution: (patch: Partial<WorkflowExecutionState>) => void;
  toggleDeployment: (open?: boolean) => void;
  resetExecution: () => void;
}

const initialNodes = buildInitialNodes();
const initialEdges = buildInitialEdges();

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: initialNodes[0]?.id ?? null,
  terminalLines: [],
  execution: { status: 'idle' },
  simulationMode: true,
  deploymentOpen: false,
  setNodes: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },
  setEdges: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },
  connect: (connection) => {
    set((state) => ({
      edges: addEdge({ ...connection, animated: true, style: { stroke: '#d4af37' } }, state.edges),
    }));
  },
  addNode: (kind) => {
    const node = buildWorkflowNode(kind);
    set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: node.id }));
  },
  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },
  updateNode: (nodeId, updater) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: updater(node.data) } : node
      ),
    }));
  },
  appendLog: (entry) => {
    const logEntry: WorkflowLogEntry = {
      id: createWorkflowId(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    set((state) => ({
      terminalLines: [logEntry, ...state.terminalLines].slice(0, 200),
    }));
  },
  setSimulationMode: (value) => set({ simulationMode: value }),
  setExecution: (patch) => {
    set((state) => ({ execution: { ...state.execution, ...patch } }));
  },
  toggleDeployment: (open) => {
    set((state) => ({ deploymentOpen: open ?? !state.deploymentOpen }));
  },
  resetExecution: () => {
    const { nodes } = get();
    set({
      execution: { status: 'idle' },
      nodes: nodes.map((node) => ({ ...node, data: { ...node.data, status: 'idle', latencyMs: undefined } })),
      terminalLines: [],
    });
  },
}));
