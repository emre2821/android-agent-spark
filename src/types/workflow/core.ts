import type { WorkflowTrigger } from './triggers';

export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type WorkflowRunStatus = 'idle' | 'running' | 'success' | 'error';
export type WorkflowStepType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'integration'
  | 'output'
  | (string & {});

export type WorkflowPortType = 'text' | 'number' | 'boolean' | 'json' | 'file' | (string & {});

export interface WorkflowPosition {
  x: number;
  y: number;
}

export interface WorkflowPort {
  id: string;
  label: string;
  dataType: WorkflowPortType;
  /**
   * Legacy workflows stored their type under `type` while newer ones
   * standardized on `dataType`. We keep the optional field so that clone
   * helpers can write both keys during migrations without losing fidelity.
   */
  type?: WorkflowPortType;
  description?: string;
  required?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WorkflowBranch {
  id: string;
  label: string;
  condition: string;
  targetStepId?: string;
}

export type WorkflowLogStatus = 'running' | 'success' | 'error';

export interface WorkflowExecutionLog {
  id: string;
  timestamp: string;
  status: WorkflowLogStatus;
  message: string;
  metadata?: Record<string, unknown>;
}

export type WorkflowStepConfig = Record<string, unknown>;

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  description?: string;
  nodeType?: string;
  position: WorkflowPosition;
  config: WorkflowStepConfig;
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  branches: WorkflowBranch[];
  logs: WorkflowExecutionLog[];
}

export interface WorkflowVersion {
  id: string;
  createdAt: string;
  note?: string;
  steps: WorkflowStep[];
  agentId?: string | null;
}

export interface WorkflowExecutionState {
  runCount: number;
  lastRunStatus: WorkflowRunStatus;
  lastRunAt?: string | null;
  schedule?: string;
}

export interface WorkflowMetadata {
  tags: string[];
  owner?: string;
  category?: string;
  [key: string]: unknown;
}

export interface WorkflowNodeData {
  summary?: string;
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: WorkflowPosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  context?: Record<string, unknown> | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger?: string | null;
  agentId: string | null;
  status: WorkflowStatus;
  version?: number;
  steps: WorkflowStep[];
  versions: WorkflowVersion[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus: WorkflowRunStatus;
  triggers?: WorkflowTrigger[];
  runs?: WorkflowRun[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  execution?: WorkflowExecutionState;
  metadata?: WorkflowMetadata;
}

export interface StoredWorkflow {
  id: string;
  name: string;
  description: string;
  trigger?: string | null;
  createdAt: string;
  updatedAt?: string;
  steps: WorkflowStep[];
  status?: WorkflowStatus;
  lastRunStatus?: WorkflowRunStatus;
  agentId?: string | null;
  version?: number;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  execution?: WorkflowExecutionState;
  metadata?: WorkflowMetadata;
  versions?: WorkflowVersion[];
  triggers?: WorkflowTrigger[];
  runs?: WorkflowRun[];
}

export const DEFAULT_STEP_POSITION: WorkflowPosition = { x: 160, y: 160 };
