import type {
  Workflow,
  WorkflowBranch,
  WorkflowEdge,
  WorkflowExecutionLog,
  WorkflowExecutionState,
  WorkflowMetadata,
  WorkflowNode,
  WorkflowPort,
  WorkflowRun,
  WorkflowStep,
  WorkflowStepConfig,
  WorkflowVersion,
} from './core';
import type { WorkflowTrigger } from './triggers';
import { ensureArray, ensureExecutionState, ensureMetadata, ensurePosition } from './hydration';
import { generateId } from './ids';

const cloneRecord = <T extends Record<string, unknown>>(value?: T | null): T =>
  ({ ...(value ?? {}) } as T);

export const clonePort = (port: WorkflowPort): WorkflowPort => {
  const clone: WorkflowPort = {
    ...port,
    dataType: port.dataType,
  };

  if (clone.type === undefined) {
    // The builder previously relied on `type` while API payloads standardize on
    // `dataType`. We write both keys during cloning to remain backward
    // compatible until downstream consumers are updated.
    clone.type = port.type ?? port.dataType;
  }

  if (port.metadata) {
    clone.metadata = cloneRecord(port.metadata);
  }

  return clone;
};

export const clonePorts = (
  ports?: readonly WorkflowPort[] | null,
): WorkflowPort[] => ensureArray(ports).map(clonePort);

const cloneBranch = (branch: WorkflowBranch): WorkflowBranch => ({ ...branch });

export const cloneBranches = (
  branches?: readonly WorkflowBranch[] | null,
): WorkflowBranch[] => ensureArray(branches).map(cloneBranch);

const cloneLog = (log: WorkflowExecutionLog): WorkflowExecutionLog => ({
  ...log,
  metadata: log.metadata ? cloneRecord(log.metadata) : undefined,
});

export const cloneLogs = (
  logs?: readonly WorkflowExecutionLog[] | null,
): WorkflowExecutionLog[] => ensureArray(logs).map(cloneLog);

const cloneConfig = (config: WorkflowStepConfig | undefined): WorkflowStepConfig => ({
  ...(config ?? {}),
});

const cloneVersion = (version: WorkflowVersion): WorkflowVersion => ({
  ...version,
  steps: cloneSteps(version.steps),
});

const cloneNodeData = (node: WorkflowNode['data'] | undefined): WorkflowNode['data'] => {
  const base = node ? { ...node } : {};
  return {
    ...(base as WorkflowNode['data']),
    inputs: clonePorts(node?.inputs),
    outputs: clonePorts(node?.outputs),
    config: cloneRecord(node?.config),
    metadata: node?.metadata ? cloneRecord(node.metadata) : undefined,
  };
};

const cloneNode = (node: WorkflowNode): WorkflowNode => ({
  ...node,
  position: ensurePosition(node.position),
  data: cloneNodeData(node.data),
});

export const cloneNodes = (
  nodes?: readonly WorkflowNode[] | null,
): WorkflowNode[] => ensureArray(nodes).map(cloneNode);

const cloneEdge = (edge: WorkflowEdge): WorkflowEdge => ({
  ...edge,
  metadata: cloneRecord(edge.metadata),
});

export const cloneEdges = (
  edges?: readonly WorkflowEdge[] | null,
): WorkflowEdge[] => ensureArray(edges).map(cloneEdge);

const cloneTrigger = (trigger: WorkflowTrigger): WorkflowTrigger => ({
  ...trigger,
  config: cloneRecord(trigger.config),
});

const cloneRun = (run: WorkflowRun): WorkflowRun => ({
  ...run,
  context: run.context ? cloneRecord(run.context) : undefined,
});

export const cloneExecution = (
  execution?: Partial<WorkflowExecutionState> | null,
): WorkflowExecutionState => ensureExecutionState(execution);

export const cloneMetadata = (
  metadata?: WorkflowMetadata | null,
): WorkflowMetadata => ensureMetadata(metadata);

export const createEmptyStep = (partial: Partial<WorkflowStep> = {}): WorkflowStep => ({
  id: partial.id ?? generateId(),
  name: partial.name ?? 'Untitled Step',
  type: partial.type ?? 'action',
  description: partial.description,
  nodeType: partial.nodeType,
  position: ensurePosition(partial.position),
  config: cloneConfig(partial.config),
  inputs: clonePorts(partial.inputs),
  outputs: clonePorts(partial.outputs),
  branches: cloneBranches(partial.branches),
  logs: cloneLogs(partial.logs),
});

export const cloneStep = (step: WorkflowStep): WorkflowStep => ({
  ...step,
  position: ensurePosition(step.position),
  config: cloneConfig(step.config),
  inputs: clonePorts(step.inputs),
  outputs: clonePorts(step.outputs),
  branches: cloneBranches(step.branches),
  logs: cloneLogs(step.logs),
});

export const cloneSteps = (
  steps?: readonly WorkflowStep[] | null,
): WorkflowStep[] => ensureArray(steps).map(cloneStep);

export const cloneWorkflow = (workflow: Workflow): Workflow => ({
  ...workflow,
  steps: cloneSteps(workflow.steps),
  versions: ensureArray(workflow.versions).map(cloneVersion),
  triggers: ensureArray(workflow.triggers).map(cloneTrigger),
  runs: ensureArray(workflow.runs).map(cloneRun),
  nodes: cloneNodes(workflow.nodes),
  edges: cloneEdges(workflow.edges),
  inputs: clonePorts(workflow.inputs),
  outputs: clonePorts(workflow.outputs),
  execution: cloneExecution(workflow.execution),
  metadata: cloneMetadata(workflow.metadata),
});
