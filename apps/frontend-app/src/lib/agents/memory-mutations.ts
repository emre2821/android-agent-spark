import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createOptimisticMemory } from '@/lib/agents/optimistic';
import {
  createMemory as apiCreateMemory,
  deleteMemory as apiDeleteMemory,
  updateMemory as apiUpdateMemory,
} from '@/lib/api/memory';
import type { MemoryItem, MemoryType } from '@/types/memory';

const agentsKey = ['agents'] as const;
const memoryKey = (agentId: string) => ['agents', agentId, 'memory'] as const;

export const useCreateMemoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      input,
    }: {
      agentId: string;
      input: { key: string; value: string; type: MemoryType };
    }) => apiCreateMemory(agentId, input),
    onMutate: async ({ agentId, input }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      const tempId = `temp-memory-${Date.now()}`;
      const optimistic = createOptimisticMemory(agentId, input, tempId);
      queryClient.setQueryData<MemoryItem[]>(key, [...previous, optimistic]);
      return { key, previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (memory, _input, context) => {
      if (context?.key) {
        queryClient.setQueryData<MemoryItem[]>(context.key, (current = []) =>
          current.map((item) => (item.id === context.tempId ? memory : item)),
        );
        void queryClient.invalidateQueries({ queryKey: agentsKey });
      }
    },
  });
};

export const useUpdateMemoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      memoryId,
      input,
    }: {
      agentId: string;
      memoryId: string;
      input: Partial<{ key: string; value: string; type: MemoryType }>;
    }) => apiUpdateMemory(memoryId, input),
    onMutate: async ({ agentId, memoryId, input }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) => (item.id === memoryId ? { ...item, ...input } : item)),
      );
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (memory, { agentId }) => {
      const key = memoryKey(agentId);
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) => (item.id === memory.id ? memory : item)),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};

export const useDeleteMemoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      memoryId,
    }: {
      agentId: string;
      memoryId: string;
    }) => apiDeleteMemory(memoryId),
    onMutate: async ({ agentId, memoryId }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.filter((item) => item.id !== memoryId),
      );
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (_data, { agentId }) => {
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};
