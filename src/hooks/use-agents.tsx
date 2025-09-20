

}

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
