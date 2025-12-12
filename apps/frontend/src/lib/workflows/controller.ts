import type {
  Workflow,
  WorkflowExecutionLog,
  WorkflowExecutionState,
  WorkflowMetadata,
  WorkflowPort,
  WorkflowStep,
  WorkflowVersion,
} from '@/types/workflow';
import {
  cloneBranches,
  cloneExecution,
  cloneLogs,
  cloneMetadata,
  clonePorts,
  cloneStep,
  cloneSteps,
  cloneWorkflow,
  createEmptyStep,
  ensureArray,
  ensureExecutionState,
  ensureMetadata,
  generateId,
} from '@/types/workflow';

export type WorkflowStateUpdater = Workflow[] | ((previous: Workflow[]) => Workflow[]);

export interface WorkflowsController {
  getWorkflows: () => Workflow[];
  setWorkflows: (updater: WorkflowStateUpdater) => void;
}

export interface CreateWorkflowInput {
  name: string;
  description: string;
  agentId?: string | null;
  steps?: WorkflowStep[];
  status?: Workflow['status'];
  execution?: Partial<WorkflowExecutionState> | null;
  metadata?: WorkflowMetadata | null;
  inputs?: WorkflowPort[] | null;
  outputs?: WorkflowPort[] | null;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  agentId?: string | null;
  status?: Workflow['status'];
  lastRunAt?: string;
  lastRunStatus?: Workflow['lastRunStatus'];
  execution?: Partial<WorkflowExecutionState> | null;
  metadata?: WorkflowMetadata | null;
  inputs?: WorkflowPort[] | null;
  outputs?: WorkflowPort[] | null;
}

export interface WorkflowsManager {
  createWorkflow: (input: CreateWorkflowInput) => Workflow;
  updateWorkflow: (workflowId: string, updates: UpdateWorkflowInput) => void;
  removeWorkflow: (workflowId: string) => void;
  addStep: (workflowId: string, step?: Partial<WorkflowStep>) => WorkflowStep | undefined;
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  removeStep: (workflowId: string, stepId: string) => void;
  logStepExecution: (
    workflowId: string,
    stepId: string,
    log: Omit<WorkflowExecutionLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  ) => WorkflowExecutionLog | undefined;
  createVersionSnapshot: (workflowId: string, note?: string) => WorkflowVersion | undefined;
  applyWorkflowToAgent: (workflowId: string, agentId: string) => void;
  runWorkflow: (workflowId: string) => void;
}

const buildWorkflow = (input: CreateWorkflowInput): Workflow => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: input.name,
    description: input.description,
    agentId: input.agentId ?? null,
    steps: cloneSteps(input.steps),
    status: input.status ?? 'draft',
    createdAt: now,
    updatedAt: now,
    versions: [],
    lastRunStatus: 'idle',
    triggers: [],
    runs: [],
    nodes: [],
    edges: [],
    inputs: clonePorts(input.inputs),
    outputs: clonePorts(input.outputs),
    execution: ensureExecutionState(input.execution),
    metadata: ensureMetadata(input.metadata ?? null),
  };
};

const mapUpdate = (workflow: Workflow, updates: UpdateWorkflowInput): Workflow => ({
  ...workflow,
  ...updates,
  inputs: updates.inputs ? clonePorts(updates.inputs) : workflow.inputs,
  outputs: updates.outputs ? clonePorts(updates.outputs) : workflow.outputs,
  execution: updates.execution ? cloneExecution(updates.execution) : workflow.execution,
  metadata: updates.metadata ? cloneMetadata(updates.metadata) : workflow.metadata,
  updatedAt: new Date().toISOString(),
});

export const createWorkflowsManager = ({ getWorkflows, setWorkflows }: WorkflowsController): WorkflowsManager => {
  const updateWorkflowState = (
    workflowId: string,
    updater: (workflow: Workflow) => Workflow,
  ) => {
    setWorkflows((previous) =>
      previous.map((workflow) => (workflow.id === workflowId ? updater(cloneWorkflow(workflow)) : workflow)),
    );
  };

  const createWorkflow = (input: CreateWorkflowInput): Workflow => {
    const workflow = buildWorkflow(input);
    setWorkflows((previous) => [...previous, workflow]);
    return workflow;
  };

  const updateWorkflow = (workflowId: string, updates: UpdateWorkflowInput) => {
    updateWorkflowState(workflowId, (workflow) => mapUpdate(workflow, updates));
  };

  const removeWorkflow = (workflowId: string) => {
    setWorkflows((previous) => previous.filter((workflow) => workflow.id !== workflowId));
  };

  const addStep = (workflowId: string, step?: Partial<WorkflowStep>) => {
    const nextStep = createEmptyStep(step);
    updateWorkflowState(workflowId, (workflow) => ({
      ...workflow,
      steps: [...workflow.steps, nextStep],
      updatedAt: new Date().toISOString(),
    }));
    return nextStep;
  };

  const updateStep = (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => {
    updateWorkflowState(workflowId, (workflow) => ({
      ...workflow,
      steps: workflow.steps.map((step) => {
        if (step.id !== stepId) {
          return step;
        }

        const base = cloneStep(step);
        return {
          ...base,
          ...updates,
          config: updates.config ? { ...base.config, ...updates.config } : base.config,
          position: updates.position ? { ...base.position, ...updates.position } : base.position,
          inputs: updates.inputs ? clonePorts(updates.inputs) : base.inputs,
          outputs: updates.outputs ? clonePorts(updates.outputs) : base.outputs,
          branches: updates.branches ? cloneBranches(updates.branches) : base.branches,
          logs: updates.logs ? cloneLogs(updates.logs) : base.logs,
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const removeStep = (workflowId: string, stepId: string) => {
    updateWorkflowState(workflowId, (workflow) => ({
      ...workflow,
      steps: workflow.steps.filter((step) => step.id !== stepId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const logStepExecution: WorkflowsManager['logStepExecution'] = (workflowId, stepId, logInput) => {
    const log: WorkflowExecutionLog = {
      id: logInput.id ?? generateId(),
      timestamp: logInput.timestamp ?? new Date().toISOString(),
      status: logInput.status,
      message: logInput.message,
      metadata: logInput.metadata,
    };

    updateWorkflowState(workflowId, (workflow) => ({
      ...workflow,
      steps: workflow.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              logs: [...step.logs, log],
            }
          : step,
      ),
      updatedAt: new Date().toISOString(),
    }));

    return log;
  };

  const createVersionSnapshot = (workflowId: string, note?: string) => {
    const workflows = getWorkflows();
    const workflow = workflows.find((item) => item.id === workflowId);
    if (!workflow) return undefined;

    const version: WorkflowVersion = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      note,
      steps: cloneSteps(workflow.steps),
      agentId: workflow.agentId,
    };

    updateWorkflowState(workflowId, (current) => ({
      ...current,
      versions: [version, ...current.versions],
      updatedAt: new Date().toISOString(),
    }));

    return version;
  };

  const applyWorkflowToAgent = (workflowId: string, agentId: string) => {
    updateWorkflow(workflowId, { agentId, status: 'active' });
    createVersionSnapshot(workflowId, `Applied to agent ${agentId}`);
  };

  const runWorkflow = (workflowId: string) => {
    const workflows = getWorkflows();
    const workflow = workflows.find((item) => item.id === workflowId);
    if (!workflow) return;

    const start = new Date().toISOString();

    // Use for..of instead of forEach for better performance
    for (const step of workflow.steps) {
      logStepExecution(workflowId, step.id, {
        status: 'running',
        message: `Started ${step.name}`,
        timestamp: start,
      });
      logStepExecution(workflowId, step.id, {
        status: 'success',
        message: `Completed ${step.name}`,
      });
    }

    updateWorkflow(workflowId, {
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'success',
    });

    createVersionSnapshot(workflowId, 'Run completed');
  };

  return {
    createWorkflow,
    updateWorkflow,
    removeWorkflow,
    addStep,
    updateStep,
    removeStep,
    logStepExecution,
    createVersionSnapshot,
    applyWorkflowToAgent,
    runWorkflow,
  };
};

export const createInMemoryWorkflowsManager = (initial?: Workflow[]) => {
  let state = initial ? initial.map((workflow) => cloneWorkflow(workflow)) : [];

  const getWorkflows = () => state;
  const setWorkflows: WorkflowsController['setWorkflows'] = (updater) => {
    state = typeof updater === 'function' ? (updater as (prev: Workflow[]) => Workflow[])(state) : updater;
  };

  return {
    getWorkflows,
    ...createWorkflowsManager({ getWorkflows, setWorkflows }),
  };
};
