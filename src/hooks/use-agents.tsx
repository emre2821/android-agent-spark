import React, {
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

interface AgentsContextValue {
  agents: Agent[];
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
}

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
};

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
    enabled: Boolean(agentId) && enabled,
  });
};

export const useAgentTasks = (agentId: string | null, enabled = true) => {
  const key = agentId ? tasksKey(agentId) : ['agents', 'tasks', 'idle'];
  return useQuery<Task[]>({
    queryKey: key,
    queryFn: () => fetchTasks(agentId as string),
    enabled: Boolean(agentId) && enabled,
  });
};
