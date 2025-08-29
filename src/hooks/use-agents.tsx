import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';

interface AgentsContextValue {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

const fetchAgents = async (): Promise<Agent[]> => {
  const res = await fetch('http://localhost:3001/agents');
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
};

export const AgentsProvider = ({ children }: { children: React.ReactNode }) => {
  const { data } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (data) setAgents(data);
  }, [data]);

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
