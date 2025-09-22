import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Agent, AgentMemory, AgentTask } from '@/types/agent';

const rawApiBase = import.meta.env.VITE_API_URL?.trim();
export const apiBaseUrl = rawApiBase ? rawApiBase.replace(/\/$/, '') : '';
export const agentsApiBase = apiBaseUrl ? `${apiBaseUrl}/agents` : '/agents';

export const buildAgentsApiUrl = (path = '') => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (path.startsWith('/agents')) {
    return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
  }

  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (apiBaseUrl) {
    return `${apiBaseUrl}/agents${normalizedPath}`;
  }
  return `/agents${normalizedPath}`;
};

const queryKey = ['agents'];

type CreateAgentInput = Pick<Agent, 'name' | 'description' | 'status'>;
type UpdateAgentInput = Partial<Pick<Agent, 'name' | 'description' | 'status'>>;
type MemoryInput = Pick<AgentMemory, 'key' | 'value' | 'type'>;
type TaskInput = Partial<Pick<AgentTask, 'title' | 'status'>>;

interface AgentsContextValue {
  agents: Agent[];
  isLoading: boolean;
  createAgent: (payload: CreateAgentInput) => Promise<Agent>;
  updateAgent: (agentId: string, updates: UpdateAgentInput) => Promise<Agent>;
  deleteAgent: (agentId: string) => Promise<void>;
  fetchAgentTasks: (agentId: string) => Promise<AgentTask[]>;
  createTask: (agentId: string, payload: TaskInput) => Promise<AgentTask>;
  updateTask: (agentId: string, taskId: string, payload: TaskInput) => Promise<AgentTask>;
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

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(buildAgentsApiUrl(path), { ...init, headers });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message;
    throw new Error(message || 'Request failed');
  }

  return data;
}

const fetchAgents = async (): Promise<Agent[]> => {
  const data = await request('/agents');
  return Array.isArray(data) ? data : [];
};

function deriveWebSocketUrl(baseUrl: string) {
  const httpOrigin =
    baseUrl && baseUrl.length > 0
      ? baseUrl
      : typeof window !== 'undefined'
      ? window.location.origin
      : '';

  if (!httpOrigin) {
    return '/ws';
  }

  try {
    const url = new URL(httpOrigin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    return url.toString();
  } catch {
    const normalized = httpOrigin.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${normalized}/ws`;
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
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey,
    queryFn: fetchAgents,
  });

  const createAgentMutation = useMutation({
    mutationFn: async (payload: CreateAgentInput) =>
      request('/agents', { method: 'POST', body: JSON.stringify(payload) }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKey) ?? [];
      const optimistic: Agent = {
        id: `optimistic-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        status: payload.status,
        tasksCompleted: 0,
        memoryItems: 0,
        lastActive: 'Just now',
      };
      queryClient.setQueryData<Agent[]>(queryKey, [...previousAgents, optimistic]);
      return { previousAgents, optimisticId: optimistic.id };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKey, context.previousAgents);
      }
    },
    onSuccess: (agent, _payload, context) => {
      queryClient.setQueryData<Agent[]>(queryKey, (current = []) => {
        const filtered = context?.optimisticId
          ? current.filter((item) => item.id !== context.optimisticId)
          : current;
        return applyAgentUpdate(filtered, agent as Agent);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ agentId, updates }: { agentId: string; updates: UpdateAgentInput }) =>
      request(`/agents/${agentId}`, { method: 'PUT', body: JSON.stringify(updates) }),
    onMutate: async ({ agentId, updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKey) ?? [];
      queryClient.setQueryData<Agent[]>(queryKey, (current = []) =>
        current.map((agent) => (agent.id === agentId ? { ...agent, ...updates } : agent))
      );
      return { previousAgents };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKey, context.previousAgents);
      }
    },
    onSuccess: (agent) => {
      queryClient.setQueryData<Agent[]>(queryKey, (current = []) =>
        applyAgentUpdate(current, agent as Agent)
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      await request(`/agents/${agentId}`, { method: 'DELETE' });
      return agentId;
    },
    onMutate: async (agentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKey) ?? [];
      queryClient.setQueryData<Agent[]>(queryKey, (current = []) =>
        removeAgent(current, agentId)
      );
      return { previousAgents };
    },
    onError: (_error, _agentId, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKey, context.previousAgents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateAgentFromServer = useCallback(
    (agent: Agent) => {
      queryClient.setQueryData<Agent[]>(queryKey, (current = []) =>
        applyAgentUpdate(current, agent)
      );
    },
    [queryClient]
  );

  const removeAgentFromServer = useCallback(
    (agentId: string) => {
      queryClient.setQueryData<Agent[]>(queryKey, (current = []) =>
        removeAgent(current, agentId)
      );
    },
    [queryClient]
  );

  useEffect(() => {
    const url = deriveWebSocketUrl(apiBaseUrl);
    let active = true;

    const connect = () => {
      if (!active) return;
      const socket = new WebSocket(url);
      websocketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { event: eventName, payload } = message ?? {};
          if (!eventName) return;
          if (eventName === 'agent:created' || eventName === 'agent:updated') {
            if (payload) {
              updateAgentFromServer(payload as Agent);
            }
          } else if (eventName === 'agent:deleted') {
            if (payload?.id) {
              removeAgentFromServer(payload.id as string);
            }
          } else if (String(eventName).startsWith('task:') || String(eventName).startsWith('memory:')) {
            if (payload?.agent) {
              updateAgentFromServer(payload.agent as Agent);
            } else if (payload?.agentId) {
              queryClient.invalidateQueries({ queryKey });
            }
          }
        } catch (error) {
          console.warn('Failed to parse websocket message', error);
        }
      };

      socket.onclose = () => {
        if (!active) return;
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [queryClient, updateAgentFromServer, removeAgentFromServer]);

  const fetchAgentTasks = useCallback(
    async (agentId: string) => {
      const data = await request(`/agents/${agentId}/tasks`);
      return Array.isArray(data) ? (data as AgentTask[]) : [];
    },
    []
  );

  const createTaskFn = useCallback(
    async (agentId: string, payload: TaskInput) => {
      const result = await request(`/agents/${agentId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
      return result?.task as AgentTask;
    },
    [updateAgentFromServer]
  );

  const updateTaskFn = useCallback(
    async (agentId: string, taskId: string, payload: TaskInput) => {
      const result = await request(`/agents/${agentId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
      return result?.task as AgentTask;
    },
    [updateAgentFromServer]
  );

  const deleteTaskFn = useCallback(
    async (agentId: string, taskId: string) => {
      const result = await request(`/agents/${agentId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
    },
    [updateAgentFromServer]
  );

  const fetchAgentMemory = useCallback(
    async (agentId: string) => {
      const data = await request(`/agents/${agentId}/memory`);
      return Array.isArray(data) ? (data as AgentMemory[]) : [];
    },
    []
  );

  const addMemoryItem = useCallback(
    async (agentId: string, payload: MemoryInput) => {
      const result = await request(`/agents/${agentId}/memory`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
      return result?.memory as AgentMemory;
    },
    [updateAgentFromServer]
  );

  const updateMemoryItem = useCallback(
    async (agentId: string, memoryId: string, payload: MemoryInput) => {
      const result = await request(`/agents/${agentId}/memory/${memoryId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
      return result?.memory as AgentMemory;
    },
    [updateAgentFromServer]
  );

  const deleteMemoryItem = useCallback(
    async (agentId: string, memoryId: string) => {
      const result = await request(`/agents/${agentId}/memory/${memoryId}`, {
        method: 'DELETE',
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
    },
    [updateAgentFromServer]
  );

  const value = useMemo<AgentsContextValue>(() => ({
    agents,
    isLoading,
    createAgent: (payload) => createAgentMutation.mutateAsync(payload) as Promise<Agent>,
    updateAgent: (agentId, updates) =>
      updateAgentMutation.mutateAsync({ agentId, updates }) as Promise<Agent>,
    deleteAgent: (agentId) => deleteAgentMutation.mutateAsync(agentId).then(() => {}),
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
  ]);

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
};

export const useAgents = () => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentsProvider');
  }
  return context;
};
