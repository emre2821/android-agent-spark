export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type WorkflowRunStatus = 'idle' | 'running' | 'success' | 'error';
export type WorkflowStepType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'integration'
  | 'output'
  | (string & {});

export type WorkflowTriggerType = 'cron' | 'webhook' | 'queue';
export type WorkflowTriggerStatus = 'active' | 'paused';

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

export interface WorkflowTriggerMetadata {
  nextRunAt?: string | null;
  preview?: string[];
}

interface WorkflowTriggerBase<Config> {
  id: string;
  workflowId: string;
  name: string;
  type: WorkflowTriggerType;
  status: WorkflowTriggerStatus;
  config: Config;
  metadata?: WorkflowTriggerMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export type CronTriggerConfig = {
  expression: string;
  timezone: string;
  payload?: Record<string, unknown> | null;
};

export interface CronWorkflowTrigger extends WorkflowTriggerBase<CronTriggerConfig> {
  type: 'cron';
  metadata?: (WorkflowTriggerMetadata & { preview?: string[] }) | null;
}

export interface WebhookTriggerConfig {
  secret?: string | null;
  path?: string | null;
}

export interface WebhookWorkflowTrigger extends WorkflowTriggerBase<WebhookTriggerConfig> {
  type: 'webhook';
}

export interface QueueTriggerConfig {
  queueName: string;
  batchSize?: number;
}

export interface QueueWorkflowTrigger extends WorkflowTriggerBase<QueueTriggerConfig> {
  type: 'queue';
}

export type WorkflowTrigger =
  | CronWorkflowTrigger
  | WebhookWorkflowTrigger
  | QueueWorkflowTrigger
  | (WorkflowTriggerBase<Record<string, unknown>> & { type: string });

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

export type WorkflowRunRecordStatus = 'pending' | 'success' | 'error';

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  triggerId: string;
  status: WorkflowRunRecordStatus;
  context?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
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
  triggers?: WorkflowTrigger[];
  runs?: WorkflowRunRecord[];
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
  triggers?: WorkflowTrigger[];
  runs?: WorkflowRunRecord[];
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

const clonePorts = (ports: WorkflowPort[] | undefined): WorkflowPort[] =>
  (ports ?? []).map(clonePort);

const cloneBranch = (branch: WorkflowBranch): WorkflowBranch => ({ ...branch });

const cloneBranches = (branches: WorkflowBranch[] | undefined): WorkflowBranch[] =>
  (branches ?? []).map(cloneBranch);

const cloneLog = (log: WorkflowExecutionLog): WorkflowExecutionLog => ({ ...log });

const cloneLogs = (logs: WorkflowExecutionLog[] | undefined): WorkflowExecutionLog[] =>
  (logs ?? []).map(cloneLog);

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
  inputs: clonePorts(partial.inputs),
  outputs: clonePorts(partial.outputs),
  branches: cloneBranches(partial.branches),
  logs: cloneLogs(partial.logs),
});

export const cloneSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.map((step) => createEmptyStep(step));

