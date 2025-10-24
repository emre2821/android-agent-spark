import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkflowRun } from '@/types/workflow';

const API_BASE = 'http://localhost:3001';

const fetchWorkflowRuns = async (): Promise<WorkflowRun[]> => {
  const response = await fetch(`${API_BASE}/workflow-runs`);
  if (!response.ok) {
    throw new Error('Failed to fetch workflow runs');
  }
  return response.json();
};

const fetchWorkflowRun = async (runId: string): Promise<WorkflowRun> => {
  const response = await fetch(`${API_BASE}/workflow-runs/${runId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch workflow run');
  }
  return response.json();
};

export const useWorkflowRuns = () => {
  return useQuery<WorkflowRun[]>({
    queryKey: ['workflow-runs'],
    queryFn: fetchWorkflowRuns,
    refetchInterval: 10000,
  });
};

export const useWorkflowRun = (runId: string | null) => {
  return useQuery<WorkflowRun>({
    queryKey: ['workflow-runs', runId],
    queryFn: () => fetchWorkflowRun(runId as string),
    enabled: Boolean(runId),
    refetchInterval: 10000,
  });
};

export const useRetryWorkflowRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason?: string }) => {
      const response = await fetch(`${API_BASE}/workflow-runs/${runId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw new Error('Failed to retry workflow run');
      }
      return response.json();
    },
    onSuccess: (run: WorkflowRun) => {
      queryClient.setQueryData(['workflow-runs', run.id], run);
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
    },
  });
};

export const useCancelWorkflowRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason?: string }) => {
      const response = await fetch(`${API_BASE}/workflow-runs/${runId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw new Error('Failed to cancel workflow run');
      }
      return response.json();
    },
    onSuccess: (run: WorkflowRun) => {
      queryClient.setQueryData(['workflow-runs', run.id], run);
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
    },
  });
};
