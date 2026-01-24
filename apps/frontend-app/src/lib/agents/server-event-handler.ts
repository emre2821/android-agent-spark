import { QueryClient } from '@tanstack/react-query';

import type { Agent } from '@/types/agent';
import type { MemoryItem } from '@/types/memory';
import type { ServerEvent } from '@/lib/realtime/events';
import type { Task } from '@/types/task';

const agentsKey = ['agents'] as const;
const memoryKey = (agentId: string) => ['agents', agentId, 'memory'] as const;
const tasksKey = (agentId: string) => ['agents', agentId, 'tasks'] as const;

export const applyAgentUpdate = (agents: Agent[], updated: Agent) => {
  const exists = agents.some((agent) => agent.id === updated.id);
  if (exists) {
    return agents.map((agent) => (agent.id === updated.id ? updated : agent));
  }
  return [...agents, updated];
};

export const removeAgent = (agents: Agent[], agentId: string) => agents.filter((agent) => agent.id !== agentId);

export const createServerEventHandler = (queryClient: QueryClient) => (event: ServerEvent) => {
  switch (event.type) {
    case 'connected':
      // Connection state is handled elsewhere
      break;
    case 'agent.created':
    case 'agent.updated':
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        applyAgentUpdate(current, event.data),
      );
      break;
    case 'agent.deleted':
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        removeAgent(current, event.data.id),
      );
      break;
    case 'task.created':
      queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) => {
        const withoutExisting = current.filter((task) => task.id !== event.data.id);
        return [event.data, ...withoutExisting];
      });
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      break;
    case 'task.updated':
      queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) =>
        current.map((task) => (task.id === event.data.id ? event.data : task)),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      break;
    case 'task.deleted':
      queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) =>
        current.filter((task) => task.id !== event.data.id),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      break;
    case 'memory.created':
      queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) => [
        ...current.filter((item) => item.id !== event.data.id),
        event.data,
      ]);
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      break;
    case 'memory.updated':
      queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) =>
        current.map((item) => (item.id === event.data.id ? event.data : item)),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      break;
    case 'memory.deleted':
      queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) =>
        current.filter((item) => item.id !== event.data.id),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      break;
    case 'task.stream':
    default:
      break;
  }
};
