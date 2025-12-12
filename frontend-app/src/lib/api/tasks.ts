import { Task, TaskStatus, TaskStreamEvent } from '@/types/task';

import { buildApiUrl } from './config';
import { fetchJson } from './fetch';

export const listTasks = (agentId: string) =>
  fetchJson<Task[]>(buildApiUrl(`/agents/${agentId}/tasks`));

export const createTask = (
  agentId: string,
  input: { title: string; status?: TaskStatus; log?: string }
) =>
  fetchJson<Task>(buildApiUrl(`/agents/${agentId}/tasks`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const updateTask = (
  taskId: string,
  input: Partial<{ title: string; status: TaskStatus; log: string }>
) =>
  fetchJson<Task>(buildApiUrl(`/tasks/${taskId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const deleteTask = (taskId: string) =>
  fetchJson<void>(buildApiUrl(`/tasks/${taskId}`), {
    method: 'DELETE',
  });

export const runTask = (taskId: string) =>
  fetchJson<Task>(buildApiUrl(`/tasks/${taskId}/run`), {
    method: 'POST',
  });

export const streamTask = (taskId: string) =>
  fetchJson<TaskStreamEvent[]>(buildApiUrl(`/tasks/${taskId}/stream`));
