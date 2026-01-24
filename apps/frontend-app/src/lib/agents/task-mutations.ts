import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createOptimisticTask } from '@/lib/agents/optimistic';
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  runTask as apiRunTask,
  updateTask as apiUpdateTask,
} from '@/lib/api/tasks';
import type { Task, TaskStatus } from '@/types/task';

const agentsKey = ['agents'] as const;
const tasksKey = (agentId: string) => ['agents', agentId, 'tasks'] as const;

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      input,
    }: {
      agentId: string;
      input: { title: string; status?: TaskStatus; log?: string };
    }) => apiCreateTask(agentId, input),
    onMutate: async ({ agentId, input }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      const tempId = `temp-task-${Date.now()}`;
      const optimistic = createOptimisticTask(agentId, input, tempId);
      queryClient.setQueryData<Task[]>(key, [optimistic, ...previous]);
      return { key, previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (task, _input, context) => {
      if (context?.key) {
        queryClient.setQueryData<Task[]>(context.key, (current = []) =>
          current.map((item) => (item.id === context.tempId ? task : item)),
        );
        void queryClient.invalidateQueries({ queryKey: agentsKey });
      }
    },
  });
};

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      taskId,
      input,
    }: {
      agentId: string;
      taskId: string;
      input: Partial<{ title: string; status: TaskStatus; log: string }>;
    }) => apiUpdateTask(taskId, input),
    onMutate: async ({ agentId, taskId, input }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === taskId ? { ...item, ...input } : item)),
      );
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (task, { agentId }) => {
      const key = tasksKey(agentId);
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === task.id ? task : item)),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agentId,
      taskId,
    }: {
      agentId: string;
      taskId: string;
    }) => apiDeleteTask(taskId),
    onMutate: async ({ agentId, taskId }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.filter((item) => item.id !== taskId),
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

export const useRunTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => apiRunTask(taskId),
    onSuccess: (task) => {
      const key = tasksKey(task.agentId);
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === task.id ? task : item)),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });
};
