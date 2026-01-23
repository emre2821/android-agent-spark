import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buildApiUrl } from '@/lib/api/config';
import { fetchJson } from '@/lib/api/fetch';
import { useAuth } from './use-auth';
import { WorkflowRun } from '@/types/workflow';

const fetchWorkflowRuns = async (workspaceId: string): Promise<WorkflowRun[]> => {
  return fetchJson<WorkflowRun[]>(buildApiUrl(`/workspaces/${workspaceId}/runs`));
};

const fetchWorkflowRun = async (workspaceId: string, runId: string): Promise<WorkflowRun> => {
  return fetchJson<WorkflowRun>(buildApiUrl(`/workspaces/${workspaceId}/runs/${runId}`));
};

const retryWorkflowRun = async (
  workspaceId: string,
  runId: string,
  reason?: string,
): Promise<WorkflowRun> => {
  return fetchJson<WorkflowRun>(buildApiUrl(`/workspaces/${workspaceId}/runs/${runId}/retry`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

const cancelWorkflowRun = async (
  workspaceId: string,
  runId: string,
  reason?: string,
): Promise<WorkflowRun> => {
  return fetchJson<WorkflowRun>(buildApiUrl(`/workspaces/${workspaceId}/runs/${runId}/cancel`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

export const useWorkflowRuns = (workspaceIdOverride?: string | null) => {
  const { currentWorkspace } = useAuth();
  const workspaceId = workspaceIdOverride ?? currentWorkspace?.id ?? null;

  return useQuery<WorkflowRun[]>({
    queryKey: ['workflow-runs', workspaceId],
    queryFn: () => fetchWorkflowRuns(workspaceId as string),
    enabled: Boolean(workspaceId),
    refetchInterval: 10000,
  });
};

export const useWorkflowRun = (runId: string | null, workspaceIdOverride?: string | null) => {
  const { currentWorkspace } = useAuth();
  const workspaceId = workspaceIdOverride ?? currentWorkspace?.id ?? null;

  return useQuery<WorkflowRun>({
    queryKey: ['workflow-runs', workspaceId, runId],
    queryFn: () => fetchWorkflowRun(workspaceId as string, runId as string),
    enabled: Boolean(runId && workspaceId),
    refetchInterval: 10000,
  });
};

export const useRetryWorkflowRun = (workspaceIdOverride?: string | null) => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = workspaceIdOverride ?? currentWorkspace?.id ?? null;

  return useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason?: string }) => {
      if (!workspaceId) {
        throw new Error('No workspace selected');
      }
      return retryWorkflowRun(workspaceId, runId, reason);
    },
    onSuccess: (run: WorkflowRun) => {
      queryClient.setQueryData(['workflow-runs', workspaceId, run.id], run);
      queryClient.invalidateQueries({ queryKey: ['workflow-runs', workspaceId] });
    },
  });
};

export const useCancelWorkflowRun = (workspaceIdOverride?: string | null) => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = workspaceIdOverride ?? currentWorkspace?.id ?? null;

  return useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason?: string }) => {
      if (!workspaceId) {
        throw new Error('No workspace selected');
      }
      return cancelWorkflowRun(workspaceId, runId, reason);
    },
    onSuccess: (run: WorkflowRun) => {
      queryClient.setQueryData(['workflow-runs', workspaceId, run.id], run);
      queryClient.invalidateQueries({ queryKey: ['workflow-runs', workspaceId] });
    },
  });
};
