import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  isLoading: boolean;
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

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
  const result = await request('/agents');
  return Array.isArray(result) ? (result as Agent[]) : [];
};

function deriveWebSocketUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    return url.toString();
  } catch {
    return baseUrl.replace(/^http/, 'ws') + '/ws';
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
  const [agents, setAgents] = useState<Agent[]>([]);

  const { data: agentsData = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
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

  const createAgentMutation = useMutation<Agent, Error, AgentInput>({
    mutationFn: async (payload) => {
      const result = (await request('/agents', {
        method: 'POST',
        body: JSON.stringify(payload),
      })) as Agent;
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
      const result = (await request(`/agents/${agentId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })) as Agent;
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
    const result = await request(`/agents/${agentId}/tasks`);
    return Array.isArray(result) ? (result as AgentTask[]) : [];
  }, []);

  const fetchAgentMemory = useCallback(async (agentId: string) => {
    const result = await request(`/agents/${agentId}/memory`);
    return Array.isArray(result) ? (result as AgentMemory[]) : [];
  }, []);

  const createTaskMutation = useMutation<AgentTask, Error, { agentId: string; payload: TaskInput }>({
    mutationFn: async ({ agentId, payload }) => {
      const result = await request(`/agents/${agentId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
      return result?.task as AgentTask;
    },
  });

  const updateTaskMutation = useMutation<AgentTask, Error, { agentId: string; taskId: string; payload: TaskUpdateInput }>({
    mutationFn: async ({ agentId, taskId, payload }) => {
      const result = await request(`/agents/${agentId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
      }
      return result?.task as AgentTask;
    },
  });

  const deleteTaskMutation = useMutation<void, Error, { agentId: string; taskId: string }>({
    mutationFn: async ({ agentId, taskId }) => {
      const result = await request(`/agents/${agentId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (result?.agent) {
        updateAgentFromServer(result.agent as Agent);
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

  useEffect(() => {
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

    const hasAddEventListener =
      typeof (socket as any)?.addEventListener === 'function';

    if (hasAddEventListener) {
      (socket as any).addEventListener('message', handleMessage);
    } else {
      (socket as any).onmessage = handleMessage as any;
    }

    return () => {
      if (!socket) {
        return;
      }
      if (hasAddEventListener) {
        (socket as any).removeEventListener('message', handleMessage);
      } else {
        (socket as any).onmessage = null;
      }
      socket.close();
    };
  }, [removeAgentFromServer, updateAgentFromServer]);

  const value = useMemo<AgentsContextValue>(
    () => ({
      agents,
      isLoading,
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
