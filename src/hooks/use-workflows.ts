import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Workflow,
  WorkflowExecutionMetadata,
  WorkflowEdge,
  WorkflowMetadata,
  WorkflowNode,
  WorkflowPort,
} from '@/types/workflow';

const API_BASE = 'http://localhost:3001/workflows';

export interface WorkflowUpsert {
  id?: string;
  name: string;
  description?: string;
  status?: Workflow['status'];
  triggerId?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  execution: WorkflowExecutionMetadata;
  metadata: WorkflowMetadata;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

const fetchWorkflows = async (): Promise<Workflow[]> => {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    throw new Error('Failed to load workflows');
  }
  return res.json();
};

const upsertWorkflow = async (workflow: WorkflowUpsert): Promise<Workflow> => {
  const hasId = Boolean(workflow.id);
  const url = hasId ? `${API_BASE}/${workflow.id}` : API_BASE;
  const method = hasId ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflow),
  });
  if (!res.ok) {
    throw new Error('Failed to save workflow');
  }
  return res.json();
};

const publishWorkflowRequest = async (workflowId: string): Promise<Workflow> => {
  const res = await fetch(`${API_BASE}/${workflowId}/publish`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to publish workflow');
  }
  return res.json();
};

const duplicateWorkflowRequest = async (workflowId: string): Promise<Workflow> => {
  const res = await fetch(`${API_BASE}/${workflowId}/duplicate`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to duplicate workflow');
  }
  return res.json();
};

const deleteWorkflowRequest = async (workflowId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/${workflowId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete workflow');
  }
};

export const useWorkflows = () => {
  const queryClient = useQueryClient();
  const {
    data: workflows = [],
    isLoading,
    error,
  } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: fetchWorkflows,
  });

  const saveMutation = useMutation({
    mutationFn: upsertWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishWorkflowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateWorkflowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflowRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const getWorkflowById = (workflowId: string) =>
    workflows.find((workflow) => workflow.id === workflowId);

  return {
    workflows,
    isLoading,
    error,
    saveWorkflow: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    publishWorkflow: publishMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    duplicateWorkflow: duplicateMutation.mutateAsync,
    isDuplicating: duplicateMutation.isPending,
    deleteWorkflow: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    getWorkflowById,
  };
};
