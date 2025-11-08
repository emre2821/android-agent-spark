import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Workflow } from '@/types/workflow';
import {
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type WorkflowsController,
  type WorkflowsManager,
  createInMemoryWorkflowsManager,
  createWorkflowsManager,
} from '@/lib/workflows/controller';
import {
  type WorkflowUpsert,
  createWorkflowService,
} from '@/lib/workflows/service';

interface WorkflowServiceState {
  getWorkflowById: (workflowId: string) => Workflow | undefined;
  saveWorkflow: (payload: WorkflowUpsert) => Promise<Workflow>;
  publishWorkflow: (workflowId: string) => Promise<Workflow>;
  duplicateWorkflow: (workflowId: string) => Promise<Workflow>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  isSaving: boolean;
  isPublishing: boolean;
  isDuplicating: boolean;
  isDeleting: boolean;
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Workflow,
  WorkflowExecutionLog,
  WorkflowExecutionStatus,
  WorkflowStep,
  WorkflowUpsert,
  WorkflowVersion,
  cloneEdges,
  cloneExecution,
  cloneMetadata,
  cloneNodes,
  clonePorts,
  cloneSteps,
  createEmptyStep,
} from '@/types/workflow';

interface CreateWorkflowInput {
  name: string;
  description: string;
  agentId?: string | null;
  steps?: WorkflowStep[];
  status?: Workflow['status'];
  nodes?: Workflow['nodes'];
  edges?: Workflow['edges'];
  inputs?: Workflow['inputs'];
  outputs?: Workflow['outputs'];
  metadata?: Workflow['metadata'];
  execution?: Partial<Workflow['execution']>;
  triggerId?: string | null;
  version?: number;
}

interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  agentId?: string | null;
  status?: Workflow['status'];
  lastRunAt?: string | null;
  lastRunStatus?: WorkflowExecutionStatus;
  nodes?: Workflow['nodes'];
  edges?: Workflow['edges'];
  inputs?: Workflow['inputs'];
  outputs?: Workflow['outputs'];
  metadata?: Workflow['metadata'];
  execution?: Workflow['execution'];
  triggerId?: string | null;
  version?: number;
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
    log: Omit<WorkflowExecutionLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  ) => WorkflowExecutionLog | undefined;
  createVersionSnapshot: (workflowId: string, note?: string) => WorkflowVersion | undefined;
  applyWorkflowToAgent: (workflowId: string, agentId: string) => void;
  runWorkflow: (workflowId: string) => void;
}

interface WorkflowsContextValue extends WorkflowsManager, WorkflowServiceState {
  workflows: Workflow[];
}

const WorkflowsContext = createContext<WorkflowsContextValue | undefined>(undefined);

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // UUID v4 polyfill fallback
  // https://stackoverflow.com/a/2117523/2715716
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const cloneWorkflow = (workflow: Workflow): Workflow => ({
  ...workflow,
  steps: cloneSteps(workflow.steps),
  nodes: cloneNodes(workflow.nodes),
  edges: cloneEdges(workflow.edges),
  inputs: clonePorts(workflow.inputs),
  outputs: clonePorts(workflow.outputs),
  execution: cloneExecution(workflow.execution),
  metadata: cloneMetadata(workflow.metadata),
  versions: workflow.versions.map((version) => ({
    ...version,
    steps: cloneSteps(version.steps),
  })),
  triggers: workflow.triggers ? [...workflow.triggers] : [],
  runs: workflow.runs ? [...workflow.runs] : [],
});

const buildWorkflow = (input: CreateWorkflowInput): Workflow => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: input.name,
    description: input.description,
    trigger: null,
    triggerId: input.triggerId ?? null,
    agentId: input.agentId ?? null,
    status: input.status ?? 'draft',
    version: input.version ?? 1,
    steps: input.steps ? cloneSteps(input.steps) : [],
    nodes: cloneNodes(input.nodes),
    edges: cloneEdges(input.edges),
    inputs: clonePorts(input.inputs),
    outputs: clonePorts(input.outputs),
    versions: [],
    triggers: [],
    runs: [],
    execution: cloneExecution({
      runCount: input.execution?.runCount ?? 0,
      lastRunStatus: input.execution?.lastRunStatus ?? 'idle',
      schedule: input.execution?.schedule,
    }),
    metadata: cloneMetadata(
      input.metadata ?? {
        tags: [],
      },
    ),
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    lastRunStatus: input.execution?.lastRunStatus ?? 'idle',
  };
};

const mergeWorkflow = (existing: Workflow, updates: UpdateWorkflowInput): Workflow => ({
  ...existing,
  ...updates,
  nodes: updates.nodes ? cloneNodes(updates.nodes) : existing.nodes,
  edges: updates.edges ? cloneEdges(updates.edges) : existing.edges,
  inputs: updates.inputs ? clonePorts(updates.inputs) : existing.inputs,
  outputs: updates.outputs ? clonePorts(updates.outputs) : existing.outputs,
  metadata: updates.metadata ? cloneMetadata(updates.metadata) : existing.metadata,
  execution: updates.execution ? cloneExecution(updates.execution) : existing.execution,
  lastRunStatus: updates.lastRunStatus ?? existing.lastRunStatus,
  triggerId: updates.triggerId ?? existing.triggerId,
  version: updates.version ?? existing.version,
  updatedAt: new Date().toISOString(),
});

export const createWorkflowsManager = ({ getWorkflows, setWorkflows }: WorkflowsController): WorkflowsManager => {
  const updateWorkflowState = (
    workflowId: string,
    updater: (workflow: Workflow) => Workflow,
  ) => {
    setWorkflows((prev) => prev.map((workflow) => (workflow.id === workflowId ? updater(workflow) : workflow)));
  };

  const createWorkflow = (input: CreateWorkflowInput): Workflow => {
    const workflow = buildWorkflow(input);
    setWorkflows((prev) => [...prev, workflow]);
    return workflow;
  };

  const updateWorkflow = (workflowId: string, updates: UpdateWorkflowInput) => {
    updateWorkflowState(workflowId, (workflow) => mergeWorkflow(workflow, updates));
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
              inputs: updates.inputs ? clonePorts(updates.inputs) : step.inputs,
              outputs: updates.outputs ? clonePorts(updates.outputs) : step.outputs,
              branches: updates.branches ?? step.branches,
              logs: updates.logs ?? step.logs,
            }
          : step,
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
      execution: {
        runCount: workflow.execution.runCount + 1,
        lastRunStatus: 'success',
        schedule: workflow.execution.schedule,
      },
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
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const controller = useMemo<WorkflowsController>(
    () => ({
      getWorkflows: () => workflows,
      setWorkflows,
    }),
    [workflows, setWorkflows],
  );

  const manager = useMemo(
    () => createWorkflowsManager(controller),
    [controller, setWorkflows],
  );
  const service = useMemo(
    () => createWorkflowService(controller),
    [controller, setWorkflows],
  );

  const getWorkflowById = useCallback(
    (workflowId: string) => service.getWorkflowById(workflowId),
    [service],
  );

  const saveWorkflow = useCallback(
    async (payload: WorkflowUpsert) => {
      setIsSaving(true);
      try {
        return await service.saveWorkflow(payload);
      } finally {
        setIsSaving(false);
      }
    },
    [service],
  );

  const publishWorkflow = useCallback(
    async (workflowId: string) => {
      setIsPublishing(true);
      try {
        return await service.publishWorkflow(workflowId);
      } finally {
        setIsPublishing(false);
      }
    },
    [service],
  );

  const duplicateWorkflow = useCallback(
    async (workflowId: string) => {
      setIsDuplicating(true);
      try {
        return await service.duplicateWorkflow(workflowId);
      } finally {
        setIsDuplicating(false);
      }
    },
    [service],
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      setIsDeleting(true);
      try {
        await service.deleteWorkflow(workflowId);
      } finally {
        setIsDeleting(false);
      }
    },
    [service],
  );

  const getWorkflowById = useCallback(
    (workflowId: string) => workflows.find((workflow) => workflow.id === workflowId),
    [workflows],
  );

  const saveWorkflow = useCallback(
    async (payload: WorkflowUpsert): Promise<Workflow> => {
      setIsSaving(true);
      try {
        let result: Workflow | undefined;
        setWorkflows((previous) => {
          const next = [...previous];
          const now = payload.updatedAt ?? new Date().toISOString();
          if (payload.id) {
            const index = next.findIndex((workflow) => workflow.id === payload.id);
            if (index !== -1) {
              const existing = next[index];
              const updated: Workflow = {
                ...existing,
                name: payload.name,
                description: payload.description,
                status: payload.status,
                version: payload.version,
                triggerId: payload.triggerId ?? null,
                nodes: cloneNodes(payload.nodes),
                edges: cloneEdges(payload.edges),
                inputs: clonePorts(payload.inputs),
                outputs: clonePorts(payload.outputs),
                execution: cloneExecution(payload.execution),
                metadata: cloneMetadata(payload.metadata),
                updatedAt: now,
                lastRunStatus: payload.execution.lastRunStatus ?? existing.lastRunStatus,
              };
              result = updated;
              next[index] = updated;
              return next;
            }
          }

          const createdAt = payload.createdAt ?? now;
          const created: Workflow = {
            id: payload.id ?? generateId(),
            name: payload.name,
            description: payload.description,
            trigger: null,
            triggerId: payload.triggerId ?? null,
            agentId: null,
            status: payload.status,
            version: payload.version,
            steps: [],
            nodes: cloneNodes(payload.nodes),
            edges: cloneEdges(payload.edges),
            inputs: clonePorts(payload.inputs),
            outputs: clonePorts(payload.outputs),
            versions: [],
            triggers: [],
            runs: [],
            execution: cloneExecution(payload.execution),
            metadata: cloneMetadata(payload.metadata),
            createdAt,
            updatedAt: now,
            lastRunAt: null,
            lastRunStatus: payload.execution.lastRunStatus ?? 'idle',
          };
          result = created;
          next.push(created);
          return next;
        });
        return result!;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const publishWorkflow = useCallback(
    async (workflowId: string): Promise<Workflow> => {
      setIsPublishing(true);
      try {
        let updatedWorkflow: Workflow | undefined;
        setWorkflows((previous) =>
          previous.map((workflow) => {
            if (workflow.id !== workflowId) {
              return workflow;
            }
            updatedWorkflow = {
              ...workflow,
              status: 'published',
              updatedAt: new Date().toISOString(),
            };
            return updatedWorkflow;
          }),
        );
        if (!updatedWorkflow) {
          throw new Error('Workflow not found');
        }
        return updatedWorkflow;
      } finally {
        setIsPublishing(false);
      }
    },
    [],
  );

  const duplicateWorkflow = useCallback(
    async (workflowId: string): Promise<Workflow> => {
      setIsDuplicating(true);
      try {
        let duplicate: Workflow | undefined;
        setWorkflows((previous) => {
          const source = previous.find((workflow) => workflow.id === workflowId);
          if (!source) {
            return previous;
          }
          duplicate = {
            ...cloneWorkflow(source),
            id: generateId(),
            name: `${source.name} copy`,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [duplicate, ...previous];
        });
        if (!duplicate) {
          throw new Error('Workflow not found');
        }
        return duplicate;
      } finally {
        setIsDuplicating(false);
      }
    },
    [],
  );

  const value = useMemo<WorkflowsContextValue>(
    () => ({
      workflows,
      ...manager,
      getWorkflowById,
      saveWorkflow,
      publishWorkflow,
      duplicateWorkflow,
      deleteWorkflow,
      isSaving,
      isPublishing,
      isDuplicating,
      isDeleting,
    }),
    [
      deleteWorkflow,
      duplicateWorkflow,
      getWorkflowById,
      isDeleting,
      isDuplicating,
      isPublishing,
      isSaving,
      manager,
      publishWorkflow,
      saveWorkflow,
      workflows,
    ],
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

export { createInMemoryWorkflowsManager };
export type { CreateWorkflowInput, UpdateWorkflowInput, WorkflowsManager, WorkflowUpsert };
export const createInMemoryWorkflowsManager = (initial?: Workflow[]) => {
  let state = initial ? initial.map((workflow) => cloneWorkflow(workflow)) : [];

  const getWorkflows = () => state;
  const setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>> = (updater) => {
    state =
      typeof updater === 'function'
        ? (updater as (prev: Workflow[]) => Workflow[])(state)
        : updater;
  };

  return {
    getWorkflows,
    ...createWorkflowsManager({ getWorkflows, setWorkflows }),
  };
};
