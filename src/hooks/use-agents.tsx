import React, {
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';
import { useAuth } from './use-auth';
import React, {
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { Agent, AgentStatus } from '@/types/agent';
import { MemoryItem, MemoryType } from '@/types/memory';
import { Task, TaskStatus, TaskStreamEvent } from '@/types/task';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3001';
const WS_BASE = API_BASE.replace(/^http/i, (match) => (match === 'https' ? 'wss' : 'ws'));

const agentsKey: QueryKey = ['agents'];
const memoryKey = (agentId: string): QueryKey => ['agents', agentId, 'memory'];
const tasksKey = (agentId: string): QueryKey => ['agents', agentId, 'tasks'];

const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const text = await response.text();
  if (!response.ok) {
    try {
      const data = text ? JSON.parse(text) : {};
      throw new Error(data.error ?? response.statusText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(response.statusText);
      }
      throw error;
    }
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
};

const fetchAgents = () => fetchJson<Agent[]>(`${API_BASE}/agents`);
const fetchMemory = (agentId: string) => fetchJson<MemoryItem[]>(`${API_BASE}/agents/${agentId}/memory`);
const fetchTasks = (agentId: string) => fetchJson<Task[]>(`${API_BASE}/agents/${agentId}/tasks`);

type ServerEvent =
  | { type: 'connected' }
  | { type: 'agent.created'; data: Agent }
  | { type: 'agent.updated'; data: Agent }
  | { type: 'agent.deleted'; data: { id: string } }
  | { type: 'task.created'; data: Task }
  | { type: 'task.updated'; data: Task }
  | { type: 'task.deleted'; data: { id: string; agentId: string } }
  | { type: 'task.stream'; data: TaskStreamEvent }
  | { type: 'memory.created'; data: MemoryItem }
  | { type: 'memory.updated'; data: MemoryItem }
  | { type: 'memory.deleted'; data: { id: string; agentId: string } };
import { createAgent, deleteAgent, listAgents, updateAgent } from '@/lib/api/agents';
import { WS_BASE } from '@/lib/api/config';
import { createMemory as createMemoryItem, deleteMemory as deleteMemoryItem, listMemory, updateMemory as updateMemoryItem } from '@/lib/api/memory';
import {
  createTask as createTaskItem,
  deleteTask as deleteTaskItem,
  listTasks,
  runTask as runTaskOnServer,
  updateTask as updateTaskItem,
} from '@/lib/api/tasks';
import {
  createOptimisticAgent,
  createOptimisticMemory,
  createOptimisticTask,
} from '@/lib/agents/optimistic';
import type { ServerEvent } from '@/lib/realtime/events';
import { Agent, AgentStatus } from '@/types/agent';
import { MemoryItem, MemoryType } from '@/types/memory';
import { Task, TaskStatus } from '@/types/task';

const agentsKey: QueryKey = ['agents'];
const memoryKey = (agentId: string): QueryKey => ['agents', agentId, 'memory'];
const tasksKey = (agentId: string): QueryKey => ['agents', agentId, 'tasks'];
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type AgentStatus = 'active' | 'inactive' | 'learning';

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  tasksCompleted: number;
  memoryItems: number;
  lastActive: string;
}

export type AgentInput = {
  name: string;
  description?: string;
  status?: AgentStatus;
};

export type AgentUpdateInput = Partial<Pick<Agent, 'name' | 'description' | 'status'>>;

export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  status: AgentTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = {
  title: string;
  status?: AgentTaskStatus;
};

export type TaskUpdateInput = Partial<Pick<AgentTask, 'title' | 'status'>>;

export type AgentMemoryType = 'fact' | 'preference' | 'skill' | 'context';

export interface AgentMemory {
  id: string;
  agentId: string;
  key: string;
  value: string;
  type: AgentMemoryType;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MemoryInput = {
  key: string;
  value: string;
  type: AgentMemoryType;
};

export interface AgentsContextValue {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
  isLoading: boolean;
  isError: boolean;
  connectionState: 'connecting' | 'open' | 'closed';
  createAgent: (input: {
    name: string;
    description?: string;
    status?: AgentStatus;
  }) => Promise<Agent>;
  updateAgent: (
    agentId: string,
    input: Partial<{ name: string; description: string; status: AgentStatus }>
  ) => Promise<Agent>;
  deleteAgent: (agentId: string) => Promise<void>;
  createMemory: (
    agentId: string,
    input: { key: string; value: string; type: MemoryType }
  ) => Promise<MemoryItem>;
  updateMemory: (
    memoryId: string,
    agentId: string,
    input: Partial<{ key: string; value: string; type: MemoryType }>
  ) => Promise<MemoryItem>;
  deleteMemory: (memoryId: string, agentId: string) => Promise<void>;
  createTask: (
    agentId: string,
    input: { title: string; status?: TaskStatus; log?: string }
  ) => Promise<Task>;
  updateTask: (
    taskId: string,
    agentId: string,
    input: Partial<{ title: string; status: TaskStatus; log: string }>
  ) => Promise<Task>;
  deleteTask: (taskId: string, agentId: string) => Promise<void>;
  runTask: (taskId: string) => Promise<Task>;
  subscribe: (listener: (event: ServerEvent) => void) => () => void;
  error: Error | null;
  createAgent: (payload: AgentInput) => Promise<Agent>;
  updateAgent: (agentId: string, updates: AgentUpdateInput) => Promise<Agent>;
  deleteAgent: (agentId: string) => Promise<void>;
  fetchAgentTasks: (agentId: string) => Promise<AgentTask[]>;
  createTask: (agentId: string, payload: TaskInput) => Promise<AgentTask>;
  updateTask: (
    agentId: string,
    taskId: string,
    payload: TaskUpdateInput
  ) => Promise<AgentTask>;
  deleteTask: (agentId: string, taskId: string) => Promise<void>;
  fetchAgentMemory: (agentId: string) => Promise<AgentMemory[]>;
  addMemoryItem: (agentId: string, payload: MemoryInput) => Promise<AgentMemory>;
  updateMemoryItem: (
    agentId: string,
    memoryId: string,
    payload: MemoryInput
  ) => Promise<AgentMemory>;
  deleteMemoryItem: (agentId: string, memoryId: string) => Promise<void>;
}

const envApiUrl = (import.meta.env?.VITE_API_URL as string | undefined)?.trim();
let normalizedBase = envApiUrl && envApiUrl.length > 0 ? envApiUrl.replace(/\/+$/, '') : '/api';
if (!normalizedBase.startsWith('http') && !normalizedBase.startsWith('/')) {
  normalizedBase = `/${normalizedBase}`;
}
export const API_BASE = normalizedBase;

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

const createOptimisticAgent = (
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

const createOptimisticMemory = (
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

const createOptimisticTask = (
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
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
export const AgentsProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const listenersRef = useRef(new Set<(event: ServerEvent) => void>());
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>(
    'connecting'
  );

  const agentsQuery = useQuery<Agent[]>({
    queryKey: agentsKey,
    queryFn: listAgents,
    staleTime: 1000 * 5,
  });

  const createAgentMutation = useMutation({
    mutationFn: (input: { name: string; description?: string; status?: AgentStatus }) =>
      createAgent(input),
    onMutate: async (input) => {
      const tempId = `temp-${Date.now()}`;
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      const optimistic = createOptimisticAgent(input, tempId);
      queryClient.setQueryData(agentsKey, [...previous, optimistic]);
      return { previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSuccess: (agent, _input, context) => {
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) => {
        return current.map((item) => (item.id === context?.tempId ? agent : item));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({
      agentId,
      input,
    }: {
      agentId: string;
      input: Partial<{ name: string; description: string; status: AgentStatus }>;
    }) =>
      updateAgent(agentId, input),
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
            : agent
        )
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
        current.map((item) => (item.id === agent.id ? agent : item))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) => deleteAgent(agentId),
    onMutate: async (agentId) => {
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      queryClient.setQueryData(
        agentsKey,
        previous.filter((agent) => agent.id !== agentId)
      );
      return { previous };
    },
    onError: (_error, _agentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const createMemoryMutation = useMutation({
    mutationFn: ({
      agentId,
      input,
    }: { agentId: string; input: { key: string; value: string; type: MemoryType } }) =>
      createMemoryItem(agentId, input),
    onMutate: async ({ agentId, input }) => {
      const tempId = `temp-${Date.now()}`;
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      const optimistic = createOptimisticMemory(agentId, input, tempId);
      queryClient.setQueryData<MemoryItem[]>(key, [optimistic, ...previous]);
      return { previous, key, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (memory, variables, context) => {
      if (context?.key) {
        queryClient.setQueryData<MemoryItem[]>(context.key, (current = []) =>
          current.map((item) => (item.id === context.tempId ? memory : item))
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: memoryKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const updateMemoryMutation = useMutation({
    mutationFn: ({
      memoryId,
      agentId,
      input,
    }: {
      memoryId: string;
      agentId: string;
      input: Partial<{ key: string; value: string; type: MemoryType }>;
    }) =>
      updateMemoryItem(memoryId, input),
    onMutate: async ({ memoryId, agentId, input }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) =>
          item.id === memoryId
            ? {
                ...item,
                ...input,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (memory) => {
      const key = memoryKey(memory.agentId);
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) => (item.id === memory.id ? memory : item))
      );
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: memoryKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: ({ memoryId }: { memoryId: string; agentId: string }) =>
      deleteMemoryItem(memoryId),
    onMutate: async ({ memoryId, agentId }: { memoryId: string; agentId: string }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, previous.filter((item) => item.id !== memoryId));
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: memoryKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({
      agentId,
      input,
    }: { agentId: string; input: { title: string; status?: TaskStatus; log?: string } }) =>
      createTaskItem(agentId, input),
    onMutate: async ({ agentId, input }) => {
      const tempId = `temp-${Date.now()}`;
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      const optimistic = createOptimisticTask(agentId, input, tempId);
      queryClient.setQueryData<Task[]>(key, [optimistic, ...previous]);
      return { previous, key, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (task, variables, context) => {
      if (context?.key) {
        queryClient.setQueryData<Task[]>(context.key, (current = []) =>
          current.map((item) => (item.id === context.tempId ? task : item))
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      agentId,
      input,
    }: {
      taskId: string;
      agentId: string;
      input: Partial<{ title: string; status: TaskStatus; log: string }>;
    }) =>
      updateTaskItem(taskId, input),
    onMutate: async ({ taskId, agentId, input }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) =>
          item.id === taskId
            ? {
                ...item,
                ...input,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (task) => {
      const key = tasksKey(task.agentId);
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === task.id ? task : item))
      );
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId }: { taskId: string; agentId: string }) =>
      deleteTaskItem(taskId),
    onMutate: async ({ taskId, agentId }: { taskId: string; agentId: string }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, previous.filter((item) => item.id !== taskId));
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const runTask = useCallback(
    async (taskId: string) => {
      const task = await runTaskOnServer(taskId);
      queryClient.setQueryData<Task[]>(tasksKey(task.agentId), (current = []) =>
        current.map((item) => (item.id === task.id ? task : item))
      );
      return task;
type RequestResult<T> = { data?: T } & Record<string, unknown>;

async function request<T = unknown>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message?: string }).message
        : undefined;
    throw new Error(message || 'Request failed');
  }

  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as RequestResult<T>).data as T;
  }

  return data as T;
}

const fetchAgents = async (): Promise<Agent[]> => {
  const result = await request<Agent[] | RequestResult<Agent[]> | { agents?: Agent[] }>(
    '/agents',
  );

  if (Array.isArray(result)) {
    return result;
  }

  const fromData = (result as RequestResult<Agent[]> | undefined)?.data;
  if (Array.isArray(fromData)) {
    return fromData;
  }

  const fromAgents = (result as { agents?: Agent[] } | undefined)?.agents;
  if (Array.isArray(fromAgents)) {
    return fromAgents;
  }

  return [];
};

function deriveWebSocketUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    return url.toString();
  } catch {
    const normalized = baseUrl.replace(/^http/, 'ws');
    return `${normalized.replace(/\/+$/, '')}/ws`;
  }
}

function applyAgentUpdate(current: Agent[], agent: Agent) {
  const existingIndex = current.findIndex((item) => item.id === agent.id);
  if (existingIndex === -1) {
    return [...current, agent];
  }
  const next = [...current];
  next[existingIndex] = agent;
  return next;
}

function removeAgent(current: Agent[], agentId: string) {
  return current.filter((item) => item.id !== agentId);
}

export const AgentsProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const listenersRef = useRef(new Set<(event: ServerEvent) => void>());
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>(
    'connecting'
  );

  const agentsQuery = useQuery<Agent[]>({
    queryKey: agentsKey,
    queryFn: fetchAgents,
    staleTime: 1000 * 5,
  });

  const createAgentMutation = useMutation({
    mutationFn: (input: { name: string; description?: string; status?: AgentStatus }) =>
      fetchJson<Agent>(`${API_BASE}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onMutate: async (input) => {
      const tempId = `temp-${Date.now()}`;
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      const optimistic = createOptimisticAgent(input, tempId);
      queryClient.setQueryData(agentsKey, [...previous, optimistic]);
      return { previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSuccess: (agent, _input, context) => {
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) => {
        return current.map((item) => (item.id === context?.tempId ? agent : item));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({
      agentId,
      input,
    }: {
      agentId: string;
      input: Partial<{ name: string; description: string; status: AgentStatus }>;
    }) =>
      fetchJson<Agent>(`${API_BASE}/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
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
            : agent
        )
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
        current.map((item) => (item.id === agent.id ? agent : item))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (agentId: string) =>
      fetchJson<void>(`${API_BASE}/agents/${agentId}`, {
        method: 'DELETE',
      }),
    onMutate: async (agentId) => {
      await queryClient.cancelQueries({ queryKey: agentsKey });
      const previous = queryClient.getQueryData<Agent[]>(agentsKey) ?? [];
      queryClient.setQueryData(
        agentsKey,
        previous.filter((agent) => agent.id !== agentId)
      );
      return { previous };
    },
    onError: (_error, _agentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agentsKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const createMemoryMutation = useMutation({
    mutationFn: ({
      agentId,
      input,
    }: { agentId: string; input: { key: string; value: string; type: MemoryType } }) =>
      fetchJson<MemoryItem>(`${API_BASE}/agents/${agentId}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onMutate: async ({ agentId, input }) => {
      const tempId = `temp-${Date.now()}`;
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      const optimistic = createOptimisticMemory(agentId, input, tempId);
      queryClient.setQueryData<MemoryItem[]>(key, [optimistic, ...previous]);
      return { previous, key, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (memory, variables, context) => {
      if (context?.key) {
        queryClient.setQueryData<MemoryItem[]>(context.key, (current = []) =>
          current.map((item) => (item.id === context.tempId ? memory : item))
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: memoryKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const updateMemoryMutation = useMutation({
    mutationFn: ({
      memoryId,
      agentId,
      input,
    }: {
      memoryId: string;
      agentId: string;
      input: Partial<{ key: string; value: string; type: MemoryType }>;
    }) =>
      fetchJson<MemoryItem>(`${API_BASE}/memory/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onMutate: async ({ memoryId, agentId, input }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) =>
          item.id === memoryId
            ? {
                ...item,
                ...input,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (memory) => {
      const key = memoryKey(memory.agentId);
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) => (item.id === memory.id ? memory : item))
      );
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: memoryKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: ({ memoryId }: { memoryId: string; agentId: string }) =>
      fetchJson<void>(`${API_BASE}/memory/${memoryId}`, {
        method: 'DELETE',
      }),
    onMutate: async ({ memoryId, agentId }: { memoryId: string; agentId: string }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, previous.filter((item) => item.id !== memoryId));
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: memoryKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({
      agentId,
      input,
    }: { agentId: string; input: { title: string; status?: TaskStatus; log?: string } }) =>
      fetchJson<Task>(`${API_BASE}/agents/${agentId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onMutate: async ({ agentId, input }) => {
      const tempId = `temp-${Date.now()}`;
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      const optimistic = createOptimisticTask(agentId, input, tempId);
      queryClient.setQueryData<Task[]>(key, [optimistic, ...previous]);
      return { previous, key, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (task, variables, context) => {
      if (context?.key) {
        queryClient.setQueryData<Task[]>(context.key, (current = []) =>
          current.map((item) => (item.id === context.tempId ? task : item))
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      agentId,
      input,
    }: {
      taskId: string;
      agentId: string;
      input: Partial<{ title: string; status: TaskStatus; log: string }>;
    }) =>
      fetchJson<Task>(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onMutate: async ({ taskId, agentId, input }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) =>
          item.id === taskId
            ? {
                ...item,
                ...input,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: (task) => {
      const key = tasksKey(task.agentId);
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === task.id ? task : item))
      );
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId }: { taskId: string; agentId: string }) =>
      fetchJson<void>(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    onMutate: async ({ taskId, agentId }: { taskId: string; agentId: string }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, previous.filter((item) => item.id !== taskId));
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.key && context.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKey(variables.agentId) });
      queryClient.invalidateQueries({ queryKey: agentsKey });
    },
  });

  const runTask = useCallback(
    async (taskId: string) => {
      const task = await fetchJson<Task>(`${API_BASE}/tasks/${taskId}/run`, {
        method: 'POST',
      });
      queryClient.setQueryData<Task[]>(tasksKey(task.agentId), (current = []) =>
        current.map((item) => (item.id === task.id ? task : item))
      );
      return task;
    },
    [queryClient]
  );

  const subscribe = useCallback((listener: (event: ServerEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setConnectionState('connecting');
      const socket = new WebSocket(`${WS_BASE}/ws`);
      websocketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        reconnectAttempts.current = 0;
        setConnectionState('open');
      };

      socket.onmessage = (event) => {
        try {
          const parsed: ServerEvent = JSON.parse(event.data);
          handleServerEvent(parsed);
        } catch (error) {
          console.error('Failed to parse server event', error);
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setConnectionState('closed');
        const timeout = Math.min(5000, 500 * 2 ** reconnectAttempts.current);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, timeout);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    const handleServerEvent = (event: ServerEvent) => {
      switch (event.type) {
        case 'agent.created':
          queryClient.setQueryData<Agent[]>(agentsKey, (current = []) => {
            const exists = current.some((agent) => agent.id === event.data.id);
            return exists ? current : [...current, event.data];
          });
          break;
        case 'agent.updated':
          queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
            current.some((agent) => agent.id === event.data.id)
              ? current.map((agent) => (agent.id === event.data.id ? event.data : agent))
              : [...current, event.data]
          );
          break;
        case 'agent.deleted':
          queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
            current.filter((agent) => agent.id !== event.data.id)
          );
          break;
        case 'memory.created':
          queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) => {
            const filtered = current.filter((item) => item.id !== event.data.id);
            return [event.data, ...filtered];
          });
          break;
        case 'memory.updated':
          queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) =>
            current.map((item) => (item.id === event.data.id ? event.data : item))
          );
          break;
        case 'memory.deleted':
          queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) =>
            current.filter((item) => item.id !== event.data.id)
          );
          break;
        case 'task.created':
          queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) => {
            const filtered = current.filter((item) => item.id !== event.data.id);
            return [event.data, ...filtered];
          });
          break;
        case 'task.updated':
          queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) =>
            current.some((item) => item.id === event.data.id)
              ? current.map((item) => (item.id === event.data.id ? event.data : item))
              : [event.data, ...current]
          );
          break;
        case 'task.deleted':
          queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) =>
            current.filter((item) => item.id !== event.data.id)
          );
          break;
        case 'task.stream':
          break;
        case 'connected':
        default:
          break;
      }
      listenersRef.current.forEach((listener) => listener(event));
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      websocketRef.current?.close();
      setConnectionState('closed');
    };
  }, [queryClient]);

  const value = useMemo<AgentsContextValue>(
    () => ({
      agents: agentsQuery.data ?? [],
      isLoading: agentsQuery.isLoading,
      isError: Boolean(agentsQuery.isError),
      connectionState,
      createAgent: (input) => createAgentMutation.mutateAsync(input),
      updateAgent: (agentId, input) => updateAgentMutation.mutateAsync({ agentId, input }),
      deleteAgent: (agentId) => deleteAgentMutation.mutateAsync(agentId),
      createMemory: (agentId, input) => createMemoryMutation.mutateAsync({ agentId, input }),
      updateMemory: (memoryId, agentId, input) =>
        updateMemoryMutation.mutateAsync({ memoryId, agentId, input }),
      deleteMemory: (memoryId, agentId) =>
        deleteMemoryMutation.mutateAsync({ memoryId, agentId }),
      createTask: (agentId, input) => createTaskMutation.mutateAsync({ agentId, input }),
      updateTask: (taskId, agentId, input) =>
        updateTaskMutation.mutateAsync({ taskId, agentId, input }),
      deleteTask: (taskId, agentId) => deleteTaskMutation.mutateAsync({ taskId, agentId }),
      runTask,
      subscribe,
    }),
    [
      agentsQuery.data,
      agentsQuery.isError,
      agentsQuery.isLoading,
      connectionState,
      createAgentMutation,
      createMemoryMutation,
      createTaskMutation,
      deleteAgentMutation,
      deleteMemoryMutation,
      deleteTaskMutation,
      runTask,
      subscribe,
      updateAgentMutation,
      updateMemoryMutation,
      updateTaskMutation,
  const { token, currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id;

  const fetchAgents = async (): Promise<Agent[]> => {
    if (!workspaceId || !token) {
      return [];
    }

    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/agents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch agents');
    return res.json();
  };

  const { data, isFetching, refetch } = useQuery<Agent[]>({
    queryKey: ['agents', workspaceId, token],
  const queryClient = useQueryClient();
  const [agents, setAgents] = useState<Agent[]>([]);

  const {
    data: agentsData = [],
    isLoading,
    error,
  } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    enabled: Boolean(workspaceId && token),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    setAgents((current) => {
      if (current === agentsData) {
        return current;
      }

      if (current.length === agentsData.length) {
        const hasSameOrder = current.every(
          (agent, index) => agent.id === agentsData[index]?.id
        );
        if (hasSameOrder) {
          return current;
        }
      }

      return agentsData;
    });
  }, [agentsData]);

  const updateAgentFromServer = useCallback(
    (agent: Agent) => {
      setAgents((current) => applyAgentUpdate(current, agent));
      queryClient.setQueryData<Agent[]>(['agents'], (current) => {
        const list = current ?? [];
        return applyAgentUpdate(list, agent);
      });
    },
    [queryClient]
  );

  const removeAgentFromServer = useCallback(
    (agentId: string) => {
      setAgents((current) => removeAgent(current, agentId));
      queryClient.setQueryData<Agent[]>(['agents'], (current) => {
        const list = current ?? [];
        return removeAgent(list, agentId);
      });
    },
    [queryClient]
  );

  const subscribe = useCallback((listener: (event: ServerEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setConnectionState('connecting');
      const socket = new WebSocket(`${WS_BASE}/ws`);
      websocketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        reconnectAttempts.current = 0;
        setConnectionState('open');
      };

      socket.onmessage = (event) => {
        try {
          const parsed: ServerEvent = JSON.parse(event.data);
          handleServerEvent(parsed);
        } catch (error) {
          console.error('Failed to parse server event', error);
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        setConnectionState('closed');
        const timeout = Math.min(5000, 500 * 2 ** reconnectAttempts.current);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, timeout);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    const handleServerEvent = (event: ServerEvent) => {
      switch (event.type) {
        case 'agent.created':
          queryClient.setQueryData<Agent[]>(agentsKey, (current = []) => {
            const exists = current.some((agent) => agent.id === event.data.id);
            return exists ? current : [...current, event.data];
          });
          break;
        case 'agent.updated':
          queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
            current.some((agent) => agent.id === event.data.id)
              ? current.map((agent) => (agent.id === event.data.id ? event.data : agent))
              : [...current, event.data]
          );
          break;
        case 'agent.deleted':
          queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
            current.filter((agent) => agent.id !== event.data.id)
          );
          break;
        case 'memory.created':
          queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) => {
            const filtered = current.filter((item) => item.id !== event.data.id);
            return [event.data, ...filtered];
          });
          break;
        case 'memory.updated':
          queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) =>
            current.map((item) => (item.id === event.data.id ? event.data : item))
          );
          break;
        case 'memory.deleted':
          queryClient.setQueryData<MemoryItem[]>(memoryKey(event.data.agentId), (current = []) =>
            current.filter((item) => item.id !== event.data.id)
          );
          break;
        case 'task.created':
          queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) => {
            const filtered = current.filter((item) => item.id !== event.data.id);
            return [event.data, ...filtered];
          });
          break;
        case 'task.updated':
          queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) =>
            current.some((item) => item.id === event.data.id)
              ? current.map((item) => (item.id === event.data.id ? event.data : item))
              : [event.data, ...current]
          );
          break;
        case 'task.deleted':
          queryClient.setQueryData<Task[]>(tasksKey(event.data.agentId), (current = []) =>
            current.filter((item) => item.id !== event.data.id)
          );
          break;
        case 'task.stream':
          break;
        case 'connected':
        default:
          break;
      }
      listenersRef.current.forEach((listener) => listener(event));
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      websocketRef.current?.close();
      setConnectionState('closed');
    };
  }, [queryClient]);

  const value = useMemo<AgentsContextValue>(
    () => ({
      agents: agentsQuery.data ?? [],
      isLoading: agentsQuery.isLoading,
      isError: Boolean(agentsQuery.isError),
      connectionState,
      createAgent: (input) => createAgentMutation.mutateAsync(input),
      updateAgent: (agentId, input) => updateAgentMutation.mutateAsync({ agentId, input }),
      deleteAgent: (agentId) => deleteAgentMutation.mutateAsync(agentId),
      createMemory: (agentId, input) => createMemoryMutation.mutateAsync({ agentId, input }),
      updateMemory: (memoryId, agentId, input) =>
        updateMemoryMutation.mutateAsync({ memoryId, agentId, input }),
      deleteMemory: (memoryId, agentId) =>
        deleteMemoryMutation.mutateAsync({ memoryId, agentId }),
      createTask: (agentId, input) => createTaskMutation.mutateAsync({ agentId, input }),
      updateTask: (taskId, agentId, input) =>
        updateTaskMutation.mutateAsync({ taskId, agentId, input }),
      deleteTask: (taskId, agentId) => deleteTaskMutation.mutateAsync({ taskId, agentId }),
      runTask,
      subscribe,
    }),
    [
      agentsQuery.data,
      agentsQuery.isError,
      agentsQuery.isLoading,
      connectionState,
      createAgentMutation,
      createMemoryMutation,
      createTaskMutation,
      deleteAgentMutation,
      deleteMemoryMutation,
      deleteTaskMutation,
      runTask,
      subscribe,
      updateAgentMutation,
      updateMemoryMutation,
      updateTaskMutation,
  const createAgentMutation = useMutation<Agent, Error, AgentInput>({
    mutationFn: async (payload) => {
      const result = await request<Agent>('/agents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return result;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      const previous = queryClient.getQueryData<Agent[]>(['agents']) ?? [];
      const optimistic: Agent = {
        id: `temp-${Date.now()}`,
        name: payload.name,
        description: payload.description ?? '',
        status: payload.status ?? 'inactive',
        tasksCompleted: 0,
        memoryItems: 0,
        lastActive: 'Just now',
      };
      const next = [...previous, optimistic];
      queryClient.setQueryData(['agents'], next);
      setAgents(next);
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['agents'], context.previous);
        setAgents(context.previous);
      }
    },
    onSuccess: (agent) => {
      updateAgentFromServer(agent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const updateAgentMutation = useMutation<Agent, Error, { agentId: string; updates: AgentUpdateInput }>({
    mutationFn: async ({ agentId, updates }) => {
      const result = await request<Agent>(`/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return result;
    },
    onMutate: async ({ agentId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      const previous = queryClient.getQueryData<Agent[]>(['agents']) ?? [];
      const next = previous.map((agent) =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      );
      queryClient.setQueryData(['agents'], next);
      setAgents(next);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['agents'], context.previous);
        setAgents(context.previous);
      }
    },
    onSuccess: (agent) => {
      updateAgentFromServer(agent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const deleteAgentMutation = useMutation<void, Error, string>({
    mutationFn: async (agentId) => {
      await request(`/agents/${agentId}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (agentId) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      const previous = queryClient.getQueryData<Agent[]>(['agents']) ?? [];
      const next = removeAgent(previous, agentId);
      queryClient.setQueryData(['agents'], next);
      setAgents(next);
      return { previous };
    },
    onError: (_error, _agentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['agents'], context.previous);
        setAgents(context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const fetchAgentTasks = useCallback(async (agentId: string) => {
    const result = await request<
      AgentTask[] | RequestResult<AgentTask[]> | { tasks?: AgentTask[] }
    >(`/agents/${agentId}/tasks`);

    if (Array.isArray(result)) {
      return result;
    }

    const fromData = (result as RequestResult<AgentTask[]> | undefined)?.data;
    if (Array.isArray(fromData)) {
      return fromData;
    }

    const fromTasks = (result as { tasks?: AgentTask[] } | undefined)?.tasks;
    if (Array.isArray(fromTasks)) {
      return fromTasks;
    }

    return [];
  }, []);

  const fetchAgentMemory = useCallback(async (agentId: string) => {
    const result = await request<
      AgentMemory[] | RequestResult<AgentMemory[]> | { memories?: AgentMemory[] }
    >(`/agents/${agentId}/memory`);

    if (Array.isArray(result)) {
      return result;
    }

    const fromData = (result as RequestResult<AgentMemory[]> | undefined)?.data;
    if (Array.isArray(fromData)) {
      return fromData;
    }

    const fromMemories = (result as { memories?: AgentMemory[] } | undefined)?.memories;
    if (Array.isArray(fromMemories)) {
      return fromMemories;
    }

    return [];
  }, []);

  const createTaskMutation = useMutation<AgentTask, Error, { agentId: string; payload: TaskInput }>({
    mutationFn: async ({ agentId, payload }) => {
      const result = await request<{ task: AgentTask; agent?: Agent }>(
        `/agents/${agentId}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      if (result?.agent) {
        updateAgentFromServer(result.agent);
      }
      if (!result?.task) {
        throw new Error('Task creation response missing task payload');
      }
      return result.task;
    },
  });

  const updateTaskMutation = useMutation<AgentTask, Error, { agentId: string; taskId: string; payload: TaskUpdateInput }>({
    mutationFn: async ({ agentId, taskId, payload }) => {
      const result = await request<{ task: AgentTask; agent?: Agent }>(
        `/agents/${agentId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );
      if (result?.agent) {
        updateAgentFromServer(result.agent);
      }
      if (!result?.task) {
        throw new Error('Task update response missing task payload');
      }
      return result.task;
    },
  });

  const deleteTaskMutation = useMutation<void, Error, { agentId: string; taskId: string }>({
    mutationFn: async ({ agentId, taskId }) => {
      const result = await request<{ agent?: Agent } | null>(
        `/agents/${agentId}/tasks/${taskId}`,
        {
          method: 'DELETE',
        },
      );
      if (result?.agent) {
        updateAgentFromServer(result.agent);
      }
    },
  });

  const createTaskFn = useCallback(
    (agentId: string, payload: TaskInput) =>
      createTaskMutation.mutateAsync({ agentId, payload }),
    [createTaskMutation]
  );

  const updateTaskFn = useCallback(
    (agentId: string, taskId: string, payload: TaskUpdateInput) =>
      updateTaskMutation.mutateAsync({ agentId, taskId, payload }),
    [updateTaskMutation]
  );

  const deleteTaskFn = useCallback(
    (agentId: string, taskId: string) =>
      deleteTaskMutation.mutateAsync({ agentId, taskId }),
    [deleteTaskMutation]
  );

  const addMemoryItem = useCallback(
    async (agentId: string, payload: MemoryInput) => {
      const result = await request<{ memory: AgentMemory; agent?: Agent }>(
        `/agents/${agentId}/memory`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      if (result?.agent) {
        updateAgentFromServer(result.agent);
      }
      if (!result?.memory) {
        throw new Error('Memory creation response missing memory payload');
      }
      return result.memory;
    },
    [updateAgentFromServer]
  );

  const updateMemoryItem = useCallback(
    async (agentId: string, memoryId: string, payload: MemoryInput) => {
      const result = await request<{ memory: AgentMemory; agent?: Agent }>(
        `/agents/${agentId}/memory/${memoryId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );
      if (result?.agent) {
        updateAgentFromServer(result.agent);
      }
      if (!result?.memory) {
        throw new Error('Memory update response missing memory payload');
      }
      return result.memory;
    },
    [updateAgentFromServer]
  );

  const deleteMemoryItem = useCallback(
    async (agentId: string, memoryId: string) => {
      const result = await request<{ agent?: Agent } | null>(
        `/agents/${agentId}/memory/${memoryId}`,
        {
          method: 'DELETE',
        },
      );
      if (result?.agent) {
        updateAgentFromServer(result.agent);
      }
    },
    [updateAgentFromServer]
  );

  useEffect(() => {
    if (data) {
      setAgents(data);
    } else if (!workspaceId) {
      setAgents([]);
    }
  }, [data, workspaceId]);

  const value = useMemo(
    () => ({
      agents,
      setAgents,
      isFetching,
      refetch,
    }),
    [agents, isFetching, refetch],
    if (typeof window === 'undefined') {
      return;
    }

    const baseUrl = API_BASE.startsWith('http')
      ? API_BASE
      : `${window.location.origin}${API_BASE.startsWith('/') ? API_BASE : `/${API_BASE}`}`;

    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(deriveWebSocketUrl(baseUrl));
    } catch (error) {
      console.error('Failed to open agent websocket connection', error);
      return;
    }

    if (!socket) {
      return undefined;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data ?? '{}');
        const eventName = message?.event as string | undefined;
        const payload = message?.payload;
        if (!eventName) {
          return;
        }

        if (eventName === 'agent:deleted') {
          const agentId =
            typeof payload === 'string'
              ? payload
              : typeof payload?.id === 'string'
              ? payload.id
              : undefined;
          if (agentId) {
            removeAgentFromServer(agentId);
          }
          return;
        }

        const agentPayload: Agent | undefined =
          payload?.agent && typeof payload.agent === 'object'
            ? (payload.agent as Agent)
            : (payload as Agent);

        if (agentPayload?.id) {
          updateAgentFromServer(agentPayload);
        }
      } catch (error) {
        console.error('Failed to process agent websocket message', error);
      }
    };

    const activeSocket = socket;
    const cleanupCallbacks: Array<() => void> = [];

    const typedSocket = activeSocket as {
      addEventListener?: (type: string, listener: (event: MessageEvent) => void) => void;
      removeEventListener?: (type: string, listener: (event: MessageEvent) => void) => void;
      on?: (event: string, listener: (data: unknown) => void) => void;
      off?: (event: string, listener: (data: unknown) => void) => void;
      removeListener?: (event: string, listener: (data: unknown) => void) => void;
      onmessage?: ((event: MessageEvent) => void) | null;
      close: () => void;
    };

    if (typeof typedSocket.addEventListener === 'function') {
      typedSocket.addEventListener('message', handleMessage);
      cleanupCallbacks.push(() => {
        typedSocket.removeEventListener?.('message', handleMessage);
      });
    } else if (typeof typedSocket.on === 'function') {
      const listener = (data: unknown) => {
        handleMessage({ data } as MessageEvent);
      };
      typedSocket.on('message', listener);
      cleanupCallbacks.push(() => {
        if (typeof typedSocket.off === 'function') {
          typedSocket.off('message', listener);
        } else if (typeof typedSocket.removeListener === 'function') {
          typedSocket.removeListener('message', listener);
        }
      });
    } else {
      const previousHandler = typedSocket.onmessage;
      typedSocket.onmessage = handleMessage;
      cleanupCallbacks.push(() => {
        typedSocket.onmessage = previousHandler ?? null;
      });
    }

    cleanupCallbacks.push(() => {
      try {
        typedSocket.close();
      } catch {
        /* noop */
      }
    });

    return () => {
      cleanupCallbacks.forEach((cleanup) => {
        try {
          cleanup();
        } catch {
          /* noop */
        }
      });
    };
  }, [removeAgentFromServer, updateAgentFromServer]);

  const value = useMemo<AgentsContextValue>(
    () => ({
      agents,
      isLoading,
      error: (error as Error) ?? null,
      createAgent: (payload) => createAgentMutation.mutateAsync(payload),
      updateAgent: (agentId, updates) =>
        updateAgentMutation.mutateAsync({ agentId, updates }),
      deleteAgent: (agentId) => deleteAgentMutation.mutateAsync(agentId),
      fetchAgentTasks,
      createTask: createTaskFn,
      updateTask: updateTaskFn,
      deleteTask: deleteTaskFn,
      fetchAgentMemory,
      addMemoryItem,
      updateMemoryItem,
      deleteMemoryItem,
    }), [
      agents,
      isLoading,
      error,
      createAgentMutation,
      updateAgentMutation,
      deleteAgentMutation,
      fetchAgentTasks,
      createTaskFn,
      updateTaskFn,
      deleteTaskFn,
      fetchAgentMemory,
      addMemoryItem,
      updateMemoryItem,
      deleteMemoryItem,
    ]
  );

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
};

export const useAgents = () => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentsProvider');
  }
  return context;
};

export const useAgentMemory = (agentId: string | null, enabled = true) => {
  const key = agentId ? memoryKey(agentId) : ['agents', 'memory', 'idle'];
  return useQuery<MemoryItem[]>({
    queryKey: key,
    queryFn: () => fetchMemory(agentId as string),
    queryFn: () => listMemory(agentId as string),
    enabled: Boolean(agentId) && enabled,
  });
};

export const useAgentTasks = (agentId: string | null, enabled = true) => {
  const key = agentId ? tasksKey(agentId) : ['agents', 'tasks', 'idle'];
  return useQuery<Task[]>({
    queryKey: key,
    queryFn: () => fetchTasks(agentId as string),
    queryFn: () => listTasks(agentId as string),
    enabled: Boolean(agentId) && enabled,
  });
};
