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
  description?: string;
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

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger?: string | null;
  agentId: string | null;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  versions: WorkflowVersion[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus: WorkflowRunStatus;
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
}

export const DEFAULT_STEP_POSITION: WorkflowPosition = { x: 160, y: 160 };

type UUIDProvider = { randomUUID?: () => string };

const getUUIDProvider = (): UUIDProvider | undefined => {
  const globalWithCrypto = globalThis as typeof globalThis & { crypto?: UUIDProvider };
  return globalWithCrypto.crypto;
};

const createId = (): string => {
  const provider = getUUIDProvider();
  if (typeof provider?.randomUUID === 'function') {
    return provider.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const clonePort = (port: WorkflowPort): WorkflowPort => ({ ...port });

const cloneBranch = (branch: WorkflowBranch): WorkflowBranch => ({ ...branch });

const cloneLog = (log: WorkflowExecutionLog): WorkflowExecutionLog => ({ ...log });

const clonePosition = (position: WorkflowPosition | undefined): WorkflowPosition => ({
  x: position?.x ?? DEFAULT_STEP_POSITION.x,
  y: position?.y ?? DEFAULT_STEP_POSITION.y,
});

const cloneConfig = (config: WorkflowStepConfig | undefined): WorkflowStepConfig => ({
  ...(config ?? {}),
});

export const createEmptyStep = (partial: Partial<WorkflowStep> = {}): WorkflowStep => ({
  id: partial.id ?? createId(),
  name: partial.name ?? 'Untitled Step',
  type: partial.type ?? 'action',
  description: partial.description,
  nodeType: partial.nodeType,
  position: clonePosition(partial.position),
  config: cloneConfig(partial.config),
  inputs: (partial.inputs ?? []).map(clonePort),
  outputs: (partial.outputs ?? []).map(clonePort),
  branches: (partial.branches ?? []).map(cloneBranch),
  logs: (partial.logs ?? []).map(cloneLog),
});

export const cloneSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.map((step) => ({
    ...step,
    position: clonePosition(step.position),
    config: cloneConfig(step.config),
    inputs: step.inputs.map(clonePort),
    outputs: step.outputs.map(clonePort),
    branches: step.branches.map(cloneBranch),
    logs: step.logs.map(cloneLog),
  }));

