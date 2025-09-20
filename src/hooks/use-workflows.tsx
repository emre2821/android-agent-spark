import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  Workflow,
  WorkflowExecutionLog,
  WorkflowStep,
  WorkflowVersion,
  createEmptyStep,
  cloneSteps,
} from '@/types/workflow';

interface CreateWorkflowInput {
  name: string;
  description: string;
  agentId?: string | null;
  steps?: WorkflowStep[];
  status?: Workflow['status'];
}

interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  agentId?: string | null;
  status?: Workflow['status'];
  lastRunAt?: string;
  lastRunStatus?: Workflow['lastRunStatus'];
}

interface WorkflowsManager {
  createWorkflow: (input: CreateWorkflowInput) => Workflow;
  updateWorkflow: (workflowId: string, updates: UpdateWorkflowInput) => void;
  removeWorkflow: (workflowId: string) => void;
  addStep: (workflowId: string, step?: Partial<WorkflowStep>) => WorkflowStep | undefined;
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  removeStep: (workflowId: string, stepId: string) => void;
  logStepExecution: (
    workflowId: string,
    stepId: string,
    log: Omit<WorkflowExecutionLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ) => WorkflowExecutionLog | undefined;
  createVersionSnapshot: (workflowId: string, note?: string) => WorkflowVersion | undefined;
  applyWorkflowToAgent: (workflowId: string, agentId: string) => void;
  runWorkflow: (workflowId: string) => void;
}

interface WorkflowsContextValue extends WorkflowsManager {
  workflows: Workflow[];
}

interface WorkflowsController {
  getWorkflows: () => Workflow[];
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
}

const WorkflowsContext = createContext<WorkflowsContextValue | undefined>(undefined);

const generateId = () => crypto.randomUUID();

const cloneWorkflow = (workflow: Workflow): Workflow => ({
  ...workflow,
  steps: cloneSteps(workflow.steps),
  versions: workflow.versions.map((version) => ({
    ...version,
    steps: cloneSteps(version.steps),
  })),
});

const buildWorkflow = (input: CreateWorkflowInput): Workflow => {
  const now = new Date().toISOString();
  const steps = input.steps ? cloneSteps(input.steps) : [];
  return {
    id: generateId(),
    name: input.name,
    description: input.description,
    agentId: input.agentId ?? null,
    steps,
    status: input.status ?? 'draft',
    createdAt: now,
    updatedAt: now,
    versions: [],
    lastRunStatus: 'idle',
  };
};

export const createWorkflowsManager = ({ getWorkflows, setWorkflows }: WorkflowsController): WorkflowsManager => {
  const updateWorkflowState = (
    workflowId: string,
    updater: (workflow: Workflow) => Workflow
  ) => {
    setWorkflows((prev) => prev.map((workflow) => (workflow.id === workflowId ? updater(workflow) : workflow)));
  };

  const createWorkflow = (input: CreateWorkflowInput): Workflow => {
    const workflow = buildWorkflow(input);
    setWorkflows((prev) => [...prev, workflow]);
    return workflow;
  };

  const updateWorkflow = (workflowId: string, updates: UpdateWorkflowInput) => {
    updateWorkflowState(workflowId, (workflow) => ({
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  };

  const removeWorkflow = (workflowId: string) => {
    setWorkflows((prev) => prev.filter((workflow) => workflow.id !== workflowId));
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
      steps: workflow.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              ...updates,
              config: updates.config ? { ...step.config, ...updates.config } : step.config,
              position: updates.position ? { ...step.position, ...updates.position } : step.position,
              inputs: updates.inputs ?? step.inputs,
              outputs: updates.outputs ?? step.outputs,
              branches: updates.branches ?? step.branches,
              logs: updates.logs ?? step.logs,
            }
          : step
      ),
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
    };

    updateWorkflowState(workflowId, (workflow) => ({
      ...workflow,
      steps: workflow.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              logs: [...step.logs, log],
            }
          : step
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

    workflow.steps.forEach((step) => {
      logStepExecution(workflowId, step.id, {
        status: 'running',
        message: `Started ${step.name}`,
        timestamp: start,
      });
      logStepExecution(workflowId, step.id, {
        status: 'success',
        message: `Completed ${step.name}`,
      });
    });

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

export const WorkflowsProvider = ({ children }: { children: React.ReactNode }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  const controller = useMemo<WorkflowsController>(
    () => ({
      getWorkflows: () => workflows,
      setWorkflows,
    }),
    [workflows]
  );

  const manager = useMemo(() => createWorkflowsManager(controller), [controller]);

  const value = useMemo<WorkflowsContextValue>(
    () => ({
      workflows,
      ...manager,
    }),
    [manager, workflows]
  );

  return <WorkflowsContext.Provider value={value}>{children}</WorkflowsContext.Provider>;
};

export const useWorkflows = () => {
  const context = useContext(WorkflowsContext);
  if (!context) {
    throw new Error('useWorkflows must be used within WorkflowsProvider');
  }
  return context;
};

export const createInMemoryWorkflowsManager = (initial?: Workflow[]) => {
  let state = initial ? initial.map((workflow) => cloneWorkflow(workflow)) : [];

  const getWorkflows = () => state;
  const setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>> = (updater) => {
    state = typeof updater === 'function' ? (updater as (prev: Workflow[]) => Workflow[])(state) : updater;
  };

  return {
    getWorkflows,
    ...createWorkflowsManager({ getWorkflows, setWorkflows }),
  };
};
