import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';
import {
  getCachedAgents,
  persistAgents as persistAgentsToCache,
} from '@/lib/offline-storage';

interface AgentsContextValue {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

const fetchAgents = async (): Promise<Agent[]> => {
  const response = await fetch('http://localhost:3001/agents');
  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }
  return response.json();
};

export const AgentsProvider = ({ children }: { children: React.ReactNode }) => {
  const [agents, setAgentsState] = useState<Agent[]>([]);

  const { data } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      try {
        const remoteAgents = await fetchAgents();
        await persistAgentsToCache(remoteAgents);
        return remoteAgents;
      } catch (error) {
        const cachedAgents = await getCachedAgents();
        if (cachedAgents) {
          console.warn('Falling back to cached agent data', error);
          return cachedAgents;
        }
        throw error;
      }
    },
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    let mounted = true;
    getCachedAgents().then((cached) => {
      if (mounted && cached) {
        setAgentsState(cached);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (data) {
      setAgentsState(data);
    }
  }, [data]);

  const persistAgents = React.useCallback(async (nextAgents: Agent[]) => {
    try {
      await persistAgentsToCache(nextAgents);
    } catch (error) {
      console.warn('Failed to persist agents cache', error);
    }
  }, []);

  const setAgents = React.useCallback(
    (value: React.SetStateAction<Agent[]>) => {
      setAgentsState((previous) => {
        const next = typeof value === 'function' ? value(previous) : value;
        void persistAgents(next);
        return next;
      });
    },
    [persistAgents]
  );

  return (
    <AgentsContext.Provider value={{ agents, setAgents }}>
      {children}
    </AgentsContext.Provider>
  );
};

export const useAgents = () => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentsProvider');
  }
  return context;
};
