import { Agent, AgentStatus } from '@/types/agent';
import { MemoryItem, MemoryType } from '@/types/memory';
import { Task, TaskStatus } from '@/types/task';

export const createOptimisticAgent = (
  input: { name: string; description?: string; status?: AgentStatus },
  tempId: string
): Agent => {
  const now = new Date().toISOString();
  return {
    id: tempId,
    name: input.name,
    description: input.description ?? '',
    status: input.status ?? 'inactive',
    tasksCompleted: 0,
    memoryItems: 0,
    lastActive: now,
    createdAt: now,
    updatedAt: now,
  };
};

export const createOptimisticMemory = (
  agentId: string,
  input: { key: string; value: string; type: MemoryType },
  tempId: string
): MemoryItem => {
  const now = new Date().toISOString();
  return {
    id: tempId,
    agentId,
    key: input.key,
    value: input.value,
    type: input.type,
    createdAt: now,
    updatedAt: now,
  };
};

export const createOptimisticTask = (
  agentId: string,
  input: { title: string; status?: TaskStatus; log?: string },
  tempId: string
): Task => {
  const now = new Date().toISOString();
  return {
    id: tempId,
    agentId,
    title: input.title,
    status: input.status ?? 'pending',
    log: input.log ?? '',
    createdAt: now,
    updatedAt: now,
  };
};
