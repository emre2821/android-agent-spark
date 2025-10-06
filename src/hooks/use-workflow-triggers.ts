import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CronTriggerConfig,
  QueueTriggerConfig,
  WebhookTriggerConfig,
  Workflow,
  WorkflowTrigger,
  WorkflowTriggerStatus,
  WorkflowTriggerType,
} from '@/types/workflow';
import { apiRequest } from '@/lib/api';

export type CreateTriggerInput =
  | {
      type: 'cron';
      name: string;
      status?: WorkflowTriggerStatus;
      config: CronTriggerConfig;
    }
  | {
      type: 'webhook';
      name: string;
      status?: WorkflowTriggerStatus;
      config?: WebhookTriggerConfig;
    }
  | {
      type: 'queue';
      name: string;
      status?: WorkflowTriggerStatus;
      config: QueueTriggerConfig;
    };

type UpdateTriggerInput = {
  name?: string;
  status?: WorkflowTriggerStatus;
  type?: WorkflowTriggerType;
  config?: Partial<CronTriggerConfig | WebhookTriggerConfig | QueueTriggerConfig>;
};

export const useWorkflowTriggers = (workflow: Workflow | undefined) => {
  const queryClient = useQueryClient();
  const workflowId = workflow?.id;
  const key = useMemo(() => ['workflow-triggers', workflowId], [workflowId]);

  const ensureWorkflowMutation = useMutation({
    mutationFn: async (input: Workflow) => {
      if (!input?.id) return;
      await apiRequest(`/workflows/${input.id}`, {
        method: 'PUT',
        body: {
          id: input.id,
          name: input.name,
          description: input.description,
          status: input.status,
          agentId: input.agentId,
        },
      });
    },
  });

  const serializedWorkflow = useMemo(() => {
    if (!workflow) return undefined;
    return JSON.stringify({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      agentId: workflow.agentId,
    });
  }, [workflow?.agentId, workflow?.description, workflow?.id, workflow?.name, workflow?.status]);

  useEffect(() => {
    if (!workflow || !serializedWorkflow) return;
    ensureWorkflowMutation.mutate(workflow);
  }, [ensureWorkflowMutation, serializedWorkflow, workflow]);

  const triggersQuery = useQuery<WorkflowTrigger[]>({
    queryKey: key,
    queryFn: async () => {
      if (!workflowId) return [];
      return apiRequest<WorkflowTrigger[]>(`/workflows/${workflowId}/triggers`);
    },
    enabled: Boolean(workflowId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createTrigger = useMutation({
    mutationFn: async (input: CreateTriggerInput) => {
      if (!workflowId) throw new Error('Select a workflow first');
      return apiRequest<WorkflowTrigger>(`/workflows/${workflowId}/triggers`, {
        method: 'POST',
        body: input,
      });
    },
    onSuccess: () => invalidate(),
  });

  const updateTrigger = useMutation({
    mutationFn: async ({ triggerId, updates }: { triggerId: string; updates: UpdateTriggerInput }) => {
      if (!workflowId) throw new Error('Select a workflow first');
      return apiRequest<WorkflowTrigger>(`/workflows/${workflowId}/triggers/${triggerId}`, {
        method: 'PATCH',
        body: updates,
      });
    },
    onSuccess: () => invalidate(),
  });

  const deleteTrigger = useMutation({
    mutationFn: async (triggerId: string) => {
      if (!workflowId) throw new Error('Select a workflow first');
      await apiRequest(`/workflows/${workflowId}/triggers/${triggerId}`, { method: 'DELETE' });
    },
    onSuccess: () => invalidate(),
  });

  return {
    triggers: triggersQuery.data ?? [],
    isLoading: triggersQuery.isLoading || ensureWorkflowMutation.isPending,
    error: triggersQuery.error,
    refresh: invalidate,
    createTrigger: createTrigger.mutateAsync,
    updateTrigger: updateTrigger.mutateAsync,
    deleteTrigger: deleteTrigger.mutateAsync,
  };
};
