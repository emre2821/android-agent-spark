import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createOptimisticAgent, createOptimisticMemory, createOptimisticTask } from '@/lib/agents/optimistic';
import { createAgent as apiCreateAgent, deleteAgent as apiDeleteAgent, listAgents, updateAgent as apiUpdateAgent } from '@/lib/api/agents';
import { WS_BASE } from '@/lib/api/config';
import {
  createMemory as apiCreateMemory,
  deleteMemory as apiDeleteMemory,
  listMemory,
  updateMemory as apiUpdateMemory,
} from '@/lib/api/memory';
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  listTasks,
  runTask as apiRunTask,
  updateTask as apiUpdateTask,
} from '@/lib/api/tasks';
import type { ServerEvent, ServerEventListener } from '@/lib/realtime/events';
import type { Agent, AgentStatus } from '@/types/agent';
import type { MemoryItem, MemoryType } from '@/types/memory';
import type { Task, TaskStatus } from '@/types/task';

const agentsKey = ['agents'] as const;
const memoryKey = (agentId: string) => ['agents', agentId, 'memory'] as const;
const tasksKey = (agentId: string) => ['agents', agentId, 'tasks'] as const;

const SERVER_EVENT_TYPES: Set<ServerEvent['type']> = new Set([
  'connected',
  'agent.created',
  'agent.updated',
  'agent.deleted',
  'task.created',
  'task.updated',
  'task.deleted',
  'task.stream',
  'memory.created',
  'memory.updated',
  'memory.deleted',
]);

const resolveWebSocketUrl = (): string => {
  const base = (WS_BASE ?? '').replace(/\/$/, '');

  if (/^wss?:\/\//i.test(base)) {
    return `${base}/ws`;
  }

  if (/^https?:\/\//i.test(base)) {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
    return url.toString();
  }

  if (typeof window !== 'undefined') {
    const origin = new URL(window.location.origin);
    origin.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = base ? (base.startsWith('/') ? base : `/${base}`) : '';
    origin.pathname = `${path.replace(/\/$/, '')}/ws`;
    return origin.toString();
  }

  return 'ws://localhost:3001/ws';
};

const normalizeServerEvent = (raw: unknown): ServerEvent | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if ('type' in raw && typeof (raw as { type: unknown }).type === 'string') {
    const type = (raw as { type: string }).type as ServerEvent['type'];
    if (!SERVER_EVENT_TYPES.has(type)) {
      return null;
    }
    if ('data' in raw) {
      return { type, data: (raw as { data: unknown }).data } as ServerEvent;
    }
    return { type } as ServerEvent;
  }

  if ('event' in raw && typeof (raw as { event: unknown }).event === 'string') {
    const legacyType = (raw as { event: string }).event.replace(/:/g, '.') as ServerEvent['type'];
    if (!SERVER_EVENT_TYPES.has(legacyType)) {
      return null;
    }
    const payload = (raw as { payload?: unknown; data?: unknown }).payload ?? (raw as { payload?: unknown; data?: unknown }).data;
    if (legacyType === 'connected') {
      return { type: 'connected' };
    }
    return { type: legacyType, data: payload } as ServerEvent;
  }

  return null;
};

interface AgentsContextValue {
  agents: Agent[];
  agentsMap: ReadonlyMap<string, Agent>;
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  connectionState: 'connecting' | 'open' | 'closed';
  refetch: () => Promise<Agent[]>;
  createAgent: (input: { name: string; description?: string; status?: AgentStatus }) => Promise<Agent>;
  updateAgent: (
    agentId: string,
    input: Partial<{ name: string; description: string; status: AgentStatus }>,
  ) => Promise<Agent>;
  deleteAgent: (agentId: string) => Promise<void>;
  fetchAgentMemory: (agentId: string) => Promise<MemoryItem[]>;
  addMemoryItem: (agentId: string, input: { key: string; value: string; type: MemoryType }) => Promise<MemoryItem>;
  updateMemoryItem: (
    agentId: string,
    memoryId: string,
    input: Partial<{ key: string; value: string; type: MemoryType }>,
  ) => Promise<MemoryItem>;
  deleteMemoryItem: (agentId: string, memoryId: string) => Promise<void>;
  fetchAgentTasks: (agentId: string) => Promise<Task[]>;
  createTask: (
    agentId: string,
    input: { title: string; status?: TaskStatus; log?: string },
  ) => Promise<Task>;
  updateTask: (
    agentId: string,
    taskId: string,
    input: Partial<{ title: string; status: TaskStatus; log: string }>,
  ) => Promise<Task>;
  deleteTask: (agentId: string, taskId: string) => Promise<void>;
  runTask: (taskId: string) => Promise<Task>;
  subscribe: (listener: ServerEventListener) => () => void;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

const applyAgentUpdate = (agents: Agent[], updated: Agent) => {
  const exists = agents.some((agent) => agent.id === updated.id);
  if (exists) {
    return agents.map((agent) => (agent.id === updated.id ? updated : agent));
  }
  return [...agents, updated];
};

const removeAgent = (agents: Agent[], agentId: string) => agents.filter((agent) => agent.id !== agentId);

export const AgentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const listenersRef = useRef<Set<ServerEventListener>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>('connecting');

  const agentsQuery = useQuery<Agent[]>({
    queryKey: agentsKey,
    queryFn: listAgents,
  });

  const agents = agentsQuery.data ?? [];
  const agentsMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  const setAgents = useCallback<React.Dispatch<React.SetStateAction<Agent[]>>>(
    (updater) => {
      queryClient.setQueryData<Agent[]>(agentsKey, (current = []) =>
        typeof updater === 'function' ? (updater as (prev: Agent[]) => Agent[])(current) : updater,
      );
    },
    [queryClient],
  );

  const createAgentMutation = useMutation({
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

  const updateAgentMutation = useMutation({
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

  const deleteAgentMutation = useMutation({
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

  const fetchAgentMemory = useCallback(
    async (agentId: string) => {
      const items = await listMemory(agentId);
      queryClient.setQueryData<MemoryItem[]>(memoryKey(agentId), items);
      return items;
    },
    [queryClient],
  );

  const addMemoryItem = useCallback(
    async (agentId: string, input: { key: string; value: string; type: MemoryType }) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      const tempId = `temp-memory-${Date.now()}`;
      const optimistic = createOptimisticMemory(agentId, input, tempId);
      queryClient.setQueryData<MemoryItem[]>(key, [...previous, optimistic]);

      try {
        const memory = await apiCreateMemory(agentId, input);
        queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
          current.map((item) => (item.id === tempId ? memory : item)),
        );
        // Only invalidate agents key once, remove duplicate from finally block
        void queryClient.invalidateQueries({ queryKey: agentsKey });
        return memory;
      } catch (error) {
        queryClient.setQueryData(key, previous);
        throw error;
      }
    },
    [queryClient],
  );

  const updateMemoryItem = useCallback(
    async (
      agentId: string,
      memoryId: string,
      input: Partial<{ key: string; value: string; type: MemoryType }>,
    ) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.map((item) => (item.id === memoryId ? { ...item, ...input } : item)),
      );

      try {
        const memory = await apiUpdateMemory(memoryId, input);
        queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
          current.map((item) => (item.id === memory.id ? memory : item)),
        );
        // Only invalidate agents key once, remove duplicate from finally block
        void queryClient.invalidateQueries({ queryKey: agentsKey });
        return memory;
      } catch (error) {
        queryClient.setQueryData(key, previous);
        throw error;
      }
    },
    [queryClient],
  );

  const deleteMemoryItem = useCallback(
    async (agentId: string, memoryId: string) => {
      const key = memoryKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key) ?? [];
      queryClient.setQueryData<MemoryItem[]>(key, (current = []) =>
        current.filter((item) => item.id !== memoryId),
      );

      try {
        await apiDeleteMemory(memoryId);
        // Only invalidate agents key once, remove duplicate from finally block
        void queryClient.invalidateQueries({ queryKey: agentsKey });
      } catch (error) {
        queryClient.setQueryData(key, previous);
        throw error;
      }
    },
    [queryClient],
  );

  const fetchAgentTasks = useCallback(
    async (agentId: string) => {
      const tasks = await listTasks(agentId);
      queryClient.setQueryData<Task[]>(tasksKey(agentId), tasks);
      return tasks;
    },
    [queryClient],
  );

  const createTask = useCallback(
    async (agentId: string, input: { title: string; status?: TaskStatus; log?: string }) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      const tempId = `temp-task-${Date.now()}`;
      const optimistic = createOptimisticTask(agentId, input, tempId);
      queryClient.setQueryData<Task[]>(key, [optimistic, ...previous]);

      try {
        const task = await apiCreateTask(agentId, input);
        queryClient.setQueryData<Task[]>(key, (current = []) =>
          current.map((item) => (item.id === tempId ? task : item)),
        );
        // Only invalidate agents key once, remove duplicate from finally block
        void queryClient.invalidateQueries({ queryKey: agentsKey });
        return task;
      } catch (error) {
        queryClient.setQueryData(key, previous);
        throw error;
      }
    },
    [queryClient],
  );

  const updateTask = useCallback(
    async (
      agentId: string,
      taskId: string,
      input: Partial<{ title: string; status: TaskStatus; log: string }>,
    ) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === taskId ? { ...item, ...input } : item)),
      );

      try {
        const task = await apiUpdateTask(taskId, input);
        queryClient.setQueryData<Task[]>(key, (current = []) =>
          current.map((item) => (item.id === task.id ? task : item)),
        );
        // Only invalidate agents key once, remove duplicate from finally block
        void queryClient.invalidateQueries({ queryKey: agentsKey });
        return task;
      } catch (error) {
        queryClient.setQueryData(key, previous);
        throw error;
      }
    },
    [queryClient],
  );

  const deleteTask = useCallback(
    async (agentId: string, taskId: string) => {
      const key = tasksKey(agentId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key) ?? [];
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.filter((item) => item.id !== taskId),
      );

      try {
        await apiDeleteTask(taskId);
        // Only invalidate agents key once, remove duplicate from finally block
        void queryClient.invalidateQueries({ queryKey: agentsKey });
      } catch (error) {
        queryClient.setQueryData(key, previous);
        throw error;
      }
    },
    [queryClient],
  );

  const runTask = useCallback(
    async (taskId: string) => {
      const task = await apiRunTask(taskId);
      const key = tasksKey(task.agentId);
      queryClient.setQueryData<Task[]>(key, (current = []) =>
        current.map((item) => (item.id === task.id ? task : item)),
      );
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      return task;
    },
    [queryClient],
  );

  const subscribe = useCallback((listener: ServerEventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const handleServerEvent = useCallback(
    (event: ServerEvent) => {
      listenersRef.current.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Agent listener failed', error);
        }
      });

      switch (event.type) {
        case 'connected':
          setConnectionState('open');
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
    },
    [queryClient],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = resolveWebSocketUrl();
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(url);
      setConnectionState('connecting');
    } catch (error) {
      console.error('Failed to connect to agent websocket', error);
      setConnectionState('closed');
      return;
    }

    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionState('open');
    };

    socket.onerror = () => {
      setConnectionState('closed');
    };

    socket.onclose = () => {
      setConnectionState('closed');
    };

    socket.onmessage = (event) => {
      try {
        const parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const serverEvent = normalizeServerEvent(parsed);
        if (serverEvent) {
          handleServerEvent(serverEvent);
        }
      } catch (error) {
        console.error('Failed to process agent websocket message', error);
      }
    };

    return () => {
      socketRef.current = null;
      try {
        socket.close();
      } catch {
        /* noop */
      }
    };
  }, [handleServerEvent]);

  const value = useMemo<AgentsContextValue>(
    () => ({
      agents,
      agentsMap,
      setAgents,
      isLoading: agentsQuery.isLoading,
      isFetching: agentsQuery.isFetching,
      error: (agentsQuery.error as Error) ?? null,
      connectionState,
      refetch: async () => {
        const result = await agentsQuery.refetch();
        return result.data ?? [];
      },
      createAgent: (input) => createAgentMutation.mutateAsync(input),
      updateAgent: (agentId, input) => updateAgentMutation.mutateAsync({ agentId, input }),
      deleteAgent: (agentId) => deleteAgentMutation.mutateAsync(agentId),
      fetchAgentMemory,
      addMemoryItem,
      updateMemoryItem,
      deleteMemoryItem,
      fetchAgentTasks,
      createTask,
      updateTask,
      deleteTask,
      runTask,
      subscribe,
    }),
    [
      agents,
      agentsMap,
      agentsQuery.error,
      agentsQuery.isFetching,
      agentsQuery.isLoading,
      agentsQuery.refetch,
      connectionState,
      createAgentMutation,
      deleteAgentMutation,
      fetchAgentMemory,
      addMemoryItem,
      updateMemoryItem,
      deleteMemoryItem,
      fetchAgentTasks,
      createTask,
      updateTask,
      deleteTask,
      runTask,
      subscribe,
      updateAgentMutation,
      setAgents,
    ],
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
  const queryClient = useQueryClient();
  return useQuery<MemoryItem[]>({
    queryKey: agentId ? memoryKey(agentId) : ['agents', 'memory', 'idle'],
    queryFn: () => listMemory(agentId as string),
    enabled: Boolean(agentId) && enabled,
    initialData: () =>
      agentId ? queryClient.getQueryData<MemoryItem[]>(memoryKey(agentId)) : undefined,
  });
};

export const useAgentTasks = (agentId: string | null, enabled = true) => {
  const queryClient = useQueryClient();
  return useQuery<Task[]>({
    queryKey: agentId ? tasksKey(agentId) : ['agents', 'tasks', 'idle'],
    queryFn: () => listTasks(agentId as string),
    enabled: Boolean(agentId) && enabled,
    initialData: () => (agentId ? queryClient.getQueryData<Task[]>(tasksKey(agentId)) : undefined),
  });
};
