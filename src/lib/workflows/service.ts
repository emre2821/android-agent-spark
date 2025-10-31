import type {
  Workflow,
  WorkflowEdge,
  WorkflowExecutionState,
  WorkflowMetadata,
  WorkflowNode,
  WorkflowPort,
} from '@/types/workflow';
import {
  cloneEdges,
  cloneExecution,
  cloneMetadata,
  cloneNodes,
  clonePorts,
  cloneWorkflow,
  generateId,
} from '@/types/workflow';

import type { WorkflowsController } from './controller';

export interface WorkflowUpsert {
  id?: string;
  name: string;
  description: string;
  status: Workflow['status'];
  version: number;
  triggerId?: string;
  agentId?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  createdAt: string;
  updatedAt: string;
  execution: WorkflowExecutionState;
  metadata: WorkflowMetadata;
}

export interface WorkflowService {
  getWorkflowById: (workflowId: string) => Workflow | undefined;
  saveWorkflow: (payload: WorkflowUpsert) => Promise<Workflow>;
  publishWorkflow: (workflowId: string) => Promise<Workflow>;
  duplicateWorkflow: (workflowId: string) => Promise<Workflow>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
}

const mergeWorkflow = (payload: WorkflowUpsert, existing?: Workflow): Workflow => {
  const base = existing ? cloneWorkflow(existing) : undefined;
  const id = payload.id ?? base?.id ?? generateId();
  const createdAt = base?.createdAt ?? payload.createdAt;
  const agentId = payload.agentId ?? base?.agentId ?? null;

  return {
    ...base,
    id,
    name: payload.name,
    description: payload.description,
    status: payload.status,
    version: payload.version,
    trigger: payload.triggerId ?? base?.trigger,
    agentId,
    steps: base?.steps ?? [],
    versions: base?.versions ?? [],
    createdAt,
    updatedAt: payload.updatedAt,
    lastRunAt: base?.lastRunAt,
    lastRunStatus: base?.lastRunStatus ?? 'idle',
    triggers: base?.triggers ?? [],
    runs: base?.runs ?? [],
    nodes: cloneNodes(payload.nodes),
    edges: cloneEdges(payload.edges),
    inputs: clonePorts(payload.inputs),
    outputs: clonePorts(payload.outputs),
    execution: cloneExecution(payload.execution),
    metadata: cloneMetadata(payload.metadata),
  };
};

export const createWorkflowService = (controller: WorkflowsController): WorkflowService => {
  const getWorkflowById = (workflowId: string) =>
    controller.getWorkflows().find((workflow) => workflow.id === workflowId);

  const saveWorkflow = async (payload: WorkflowUpsert): Promise<Workflow> => {
    const existing = payload.id ? getWorkflowById(payload.id) : undefined;
    const workflow = mergeWorkflow(payload, existing);

    controller.setWorkflows((previous) => {
      const index = previous.findIndex((item) => item.id === workflow.id);
      if (index === -1) {
        return [workflow, ...previous];
      }
      const next = [...previous];
      next[index] = workflow;
      return next;
    });

    return workflow;
  };

  const publishWorkflow = async (workflowId: string): Promise<Workflow> => {
    const now = new Date().toISOString();
    let published: Workflow | undefined;

    controller.setWorkflows((previous) =>
      previous.map((workflow) => {
        if (workflow.id !== workflowId) {
          return workflow;
        }
        published = {
          ...workflow,
          status: 'active',
          updatedAt: now,
        };
        return published;
      }),
    );

    if (!published) {
      throw new Error('Workflow not found');
    }

    return published;
  };

  const duplicateWorkflow = async (workflowId: string): Promise<Workflow> => {
    const source = getWorkflowById(workflowId);
    if (!source) {
      throw new Error('Workflow not found');
    }

    const now = new Date().toISOString();
    const duplicate = {
      ...cloneWorkflow(source),
      id: generateId(),
      name: `${source.name} (Copy)`,
      status: 'draft' as Workflow['status'],
      version: 1,
      createdAt: now,
      updatedAt: now,
    } satisfies Workflow;

    controller.setWorkflows((previous) => [duplicate, ...previous]);

    return duplicate;
  };

  const deleteWorkflow = async (workflowId: string): Promise<void> => {
    controller.setWorkflows((previous) => previous.filter((workflow) => workflow.id !== workflowId));
  };

  return {
    getWorkflowById,
    saveWorkflow,
    publishWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
  };
};
