export type WorkflowStatus = 'draft' | 'published';

export interface WorkflowPort {
  id: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface WorkflowNodeIO {
  id: string;
  label: string;
  type: 'input' | 'output';
  dataType?: string;
  required?: boolean;
}

export interface WorkflowNodeData {
  summary?: string;
  inputs: WorkflowNodeIO[];
  outputs: WorkflowNodeIO[];
  config: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: {
    x: number;
    y: number;
  };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecutionMetadata {
  runCount: number;
  lastRunAt?: string;
  nextRunAt?: string;
  schedule?: string;
  lastRunStatus?: 'success' | 'failed' | 'running' | 'idle';
}

export interface WorkflowMetadata {
  tags: string[];
  owner?: string;
  category?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  triggerId?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  createdAt: string;
  updatedAt: string;
  execution: WorkflowExecutionMetadata;
  metadata: WorkflowMetadata;
}

export interface WorkflowSummary extends Pick<Workflow, 'id' | 'name' | 'status' | 'version' | 'updatedAt' | 'metadata'> {
  description?: string;
  execution: Pick<WorkflowExecutionMetadata, 'runCount' | 'lastRunAt' | 'schedule'>;
}
