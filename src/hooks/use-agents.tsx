import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';
import { useAuth } from './use-auth';

interface AgentsContextValue {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const AgentsProvider = ({ children }: { children: React.ReactNode }) => {
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
    queryFn: fetchAgents,
    enabled: Boolean(workspaceId && token),
    staleTime: 1000 * 30,
  });

  const [agents, setAgents] = useState<Agent[]>([]);

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
