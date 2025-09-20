export type WorkflowStatus = 'draft' | 'active' | 'archived';

export interface WorkflowPort {
  id: string;
  label: string;
  dataType: string;
  description?: string;
}

export interface WorkflowBranch {
  id: string;
  label: string;
  condition?: string;
  targetStepId?: string;
}

export interface WorkflowExecutionLog {
  id: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp: string;
  message?: string;
}

export interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: {
    x: number;
    y: number;
  };
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
  agentId?: string | null;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  versions: WorkflowVersion[];
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error' | 'running' | 'idle';
}

export const createEmptyStep = (overrides?: Partial<WorkflowStep>): WorkflowStep => ({
  id: overrides?.id ?? crypto.randomUUID(),
  type: overrides?.type ?? 'action',
  name: overrides?.name ?? 'New Step',
  config: overrides?.config ?? {},
  position: overrides?.position ?? { x: 120, y: 120 },
  inputs: overrides?.inputs ?? [],
  outputs: overrides?.outputs ?? [],
  branches: overrides?.branches ?? [],
  logs: overrides?.logs ?? [],
});

export const cloneSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.map((step) => ({
    ...step,
    config: { ...step.config },
    position: { ...step.position },
    inputs: step.inputs.map((port) => ({ ...port })),
    outputs: step.outputs.map((port) => ({ ...port })),
    branches: step.branches.map((branch) => ({ ...branch })),
    logs: step.logs.map((log) => ({ ...log })),
  }));
