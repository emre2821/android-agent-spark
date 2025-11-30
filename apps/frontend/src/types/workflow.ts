export * from './workflow/core';
export * from './workflow/triggers';
export * from './workflow/ids';
export * from './workflow/hydration';
export * from './workflow/clone';
import { generateUniqueId } from '@/lib/id';
export type WorkflowVersionStatus = 'draft' | 'published' | 'archived';

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived' | 'published';

export type WorkflowExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export type WorkflowRunStatus = 'running' | 'retrying' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type WorkflowStatus = 'draft' | 'active' | 'archived';
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
  type?: WorkflowPortType;
  key?: string;
  description?: string;
  dataType?: WorkflowPortType;
}

export interface WorkflowNodeData {
  summary?: string;
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  config?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowStepType;
  label: string;
  position: WorkflowPosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
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

export interface WorkflowMetadata {
  tags: string[];
  owner?: string;
  category?: string;
}

export interface WorkflowExecution {
  runCount: number;
  lastRunStatus: WorkflowExecutionStatus;
  schedule?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger?: string | null;
  triggerId?: string | null;
  agentId?: string | null;
  status: WorkflowStatus;
  version?: number;
  steps: WorkflowStep[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  versions: WorkflowVersion[];
  triggers?: WorkflowTrigger[];
  runs?: WorkflowRunRecord[];
  execution?: WorkflowExecution;
  metadata?: WorkflowMetadata;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string | null;
  lastRunStatus?: WorkflowExecutionStatus;
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
  lastRunStatus?: WorkflowExecutionStatus;
  agentId?: string | null;
  triggers?: WorkflowTrigger[];
  runs?: WorkflowRunRecord[];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  inputs?: WorkflowPort[];
  outputs?: WorkflowPort[];
  execution?: WorkflowExecution;
  metadata?: WorkflowMetadata;
}

export interface WorkflowDiffChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface WorkflowDiff {
  metadataChanges: WorkflowDiffChange[];
  addedSteps: WorkflowStep[];
  removedSteps: WorkflowStep[];
  changedSteps: Array<{
    id: string;
    name: string;
    changes: WorkflowDiffChange[];
  }>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
}

export interface WorkflowHistoryEntry {
  id: string;
  versionId: string;
  versionNumber: number;
  author: string;
  action: string;
  summary: string;
  timestamp: string;
}

export interface WorkflowCreatePayload {
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  author: string;
  changeSummary: string;
}

export interface WorkflowVersionPayload {
  definition: WorkflowDefinition;
  author: string;
  changeSummary: string;
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

export interface WorkflowStepLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown> | null;
}

export interface WorkflowStepRetry {
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastReason: string | null;
}

export interface WorkflowStepHistoryEntry {
  status: WorkflowStepStatus | WorkflowRunStatus;
  timestamp: string;
  attempt: number;
  note?: string | null;
}

export interface WorkflowStepError {
  message: string;
  code: string | null;
  attempt: number;
  timestamp: string;
}

export interface WorkflowRunStep {
  id: string;
  name: string;
  status: WorkflowStepStatus;
  attempt: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  logs: WorkflowStepLog[];
  retry: WorkflowStepRetry;
  error: WorkflowStepError | null;
  history: WorkflowStepHistoryEntry[];
}

export interface WorkflowRetryPolicy {
  strategy: string;
  maxAttempts: number;
  intervalSeconds: number;
}

export interface WorkflowRunHistoryEntry {
  status: WorkflowRunStatus | WorkflowStepStatus;
  timestamp: string;
  note?: string | null;
}

export interface WorkflowRunError {
  stepId: string | null;
  message: string;
  attempt: number;
  timestamp: string;
}

export interface WorkflowRetryEvent {
  attempt: number;
  stepId: string | null;
  scheduledAt: string | null;
  reason: string | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: string;
  status: WorkflowRunStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  currentAttempt: number;
  retryPolicy: WorkflowRetryPolicy;
  history: WorkflowRunHistoryEntry[];
  steps: WorkflowRunStep[];
  retryHistory: WorkflowRetryEvent[];
  errors: WorkflowRunError[];
  metadata: Record<string, unknown>;
}

export interface WorkflowUpsert {
  id?: string;
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
  status: WorkflowStatus;
  version: number;
  triggerId?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  execution: WorkflowExecution;
  metadata: WorkflowMetadata;
  createdAt?: string;
  updatedAt?: string;
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

export interface CronTriggerConfig {
  expression: string;
  timezone: string;
  payload?: Record<string, unknown> | null;
}

export interface WebhookTriggerConfig {
  secret: string | null;
  path: string | null;
}

export interface QueueTriggerConfig {
  queueName: string;
  batchSize: number;
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

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  name: string;
  type: WorkflowTriggerType;
  status: WorkflowTriggerStatus;
  config: CronTriggerConfig | WebhookTriggerConfig | QueueTriggerConfig;
  createdAt: string;
  updatedAt: string;
}

export type WorkflowTriggerType = 'cron' | 'webhook' | 'queue';
export type WorkflowTriggerStatus = 'active' | 'paused';

type UUIDProvider = { randomUUID?: () => string };

const getUUIDProvider = (): UUIDProvider | undefined => {
  const globalWithCrypto = globalThis as typeof globalThis & { crypto?: UUIDProvider };
  return globalWithCrypto.crypto;
};

type StructuredClone = <T>(value: T) => T;

const getStructuredClone = (): StructuredClone | undefined => {
  const globalWithStructuredClone = globalThis as typeof globalThis & {
    structuredClone?: StructuredClone;
  };
  return globalWithStructuredClone.structuredClone;
};

const structuredCloneFn = getStructuredClone();

const createId = (): string => {
  return generateUniqueId();
};

const clonePort = (port: WorkflowPort): WorkflowPort => ({
  ...port,
  type: port.type ?? port.dataType ?? 'text',
  dataType: port.type ?? port.dataType ?? 'text',
});

export const clonePorts = (ports: WorkflowPort[] | undefined): WorkflowPort[] =>
  (ports ?? []).map(clonePort);

const cloneBranch = (branch: WorkflowBranch): WorkflowBranch => ({ ...branch });

const cloneLog = (log: WorkflowExecutionLog): WorkflowExecutionLog => ({ ...log });

const clonePosition = (position: WorkflowPosition | undefined): WorkflowPosition => ({
  x: position?.x ?? DEFAULT_STEP_POSITION.x,
  y: position?.y ?? DEFAULT_STEP_POSITION.y,
});

const cloneConfig = (config: WorkflowStepConfig | undefined): WorkflowStepConfig => ({
  ...(config ?? {}),
});

export const cloneNode = (node: WorkflowNode): WorkflowNode => ({
  id: node.id,
  type: node.type,
  label: node.label,
  position: clonePosition(node.position),
  data: {
    summary: node.data.summary,
    config: { ...(node.data.config ?? {}) },
    inputs: clonePorts(node.data.inputs),
    outputs: clonePorts(node.data.outputs),
  },
});

export const cloneNodes = (nodes: WorkflowNode[] | undefined): WorkflowNode[] =>
  (nodes ?? []).map(cloneNode);

export const cloneEdge = (edge: WorkflowEdge): WorkflowEdge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle ?? undefined,
  targetHandle: edge.targetHandle ?? undefined,
  metadata: edge.metadata ? { ...edge.metadata } : undefined,
});

export const cloneEdges = (edges: WorkflowEdge[] | undefined): WorkflowEdge[] =>
  (edges ?? []).map(cloneEdge);

export const cloneExecution = (execution: WorkflowExecution | undefined): WorkflowExecution => ({
  runCount: execution?.runCount ?? 0,
  lastRunStatus: execution?.lastRunStatus ?? 'idle',
  schedule: execution?.schedule,
});

export const cloneMetadata = (metadata: WorkflowMetadata | undefined): WorkflowMetadata => ({
  tags: [...(metadata?.tags ?? [])],
  owner: metadata?.owner,
  category: metadata?.category,
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

const cloneStep = (step: WorkflowStep): WorkflowStep => {
  if (structuredCloneFn) {
    return structuredCloneFn(step);
  }

  return {
export const cloneSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.map((step) => createEmptyStep(step));
  steps.map((step) => ({
    ...step,
    position: clonePosition(step.position),
    config: cloneConfig(step.config),
    inputs: step.inputs.map(clonePort),
    outputs: step.outputs.map(clonePort),
    branches: step.branches.map(cloneBranch),
    logs: step.logs.map(cloneLog),
  };
};

export const cloneSteps = (steps: WorkflowStep[]): WorkflowStep[] => steps.map(cloneStep);

