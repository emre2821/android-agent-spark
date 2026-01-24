import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createOptimisticAgent } from '@/lib/agents/optimistic';
import { createAgent as apiCreateAgent, deleteAgent as apiDeleteAgent, updateAgent as apiUpdateAgent } from '@/lib/api/agents';
import type { Agent, AgentStatus } from '@/types/agent';

const agentsKey = ['agents'] as const;

export const useCreateAgentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; description?: string; status?: AgentStatus }) =>
      apiCreateAgent(input),
    onMutate: async (input) => {
      const tempId = `temp-agent-${Date.now()}`;
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      const optimistic = createOptimisticAgent(input, tempId);
      queryClient.setQueryData<Agent[]>(agentsKey, [...previous, optimistic]);
      return { previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSuccess: (agent, _input, context) => {
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        current.map((item) => (item.id === context?.tempId ? agent : item)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};

export const useUpdateAgentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      input,
    }: {
      agentId: string;
      input: Partial<{ name: string; description: string; status: AgentStatus }>;
    }) => apiUpdateAgent(agentId, input),
    onMutate: async ({ agentId, input }) => {
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        current.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                ...input,
                updatedAt: new Date().toISOString(),
              }
            : agent,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSuccess: (agent) => {
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        current.map((item) => (item.id === agent.id ? agent : item)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};

export const useDeleteAgentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => apiDeleteAgent(agentId),
    onMutate: async (agentId) => {
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        current.filter((agent) => agent.id !== agentId),
      );
      return { previous };
    },
    onError: (_error, _agentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};
