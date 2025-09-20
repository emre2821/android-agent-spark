import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';
import {
  cacheAgents,
  cachePendingAgents,
  clearPendingAgents,
  loadCachedAgents,
  loadPendingAgents,
} from '@/lib/offline-storage';

interface AgentsContextValue {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  isOnline: boolean;
  hasPendingSync: boolean;
  lastSyncedAt: string | null;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

const fetchAgents = async (): Promise<Agent[]> => {
  const res = await fetch('http://localhost:3001/agents');
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
};

export const AgentsProvider = ({ children }: { children: React.ReactNode }) => {
  const [agents, internalSetAgents] = useState<Agent[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true,
  );
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const initializingRef = useRef(true);
  const pendingUpdateRef = useRef(false);

  const { data, refetch } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    enabled: isOnline && !hasPendingSync,
    staleTime: 1000 * 60,
    retry: 1,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(window.navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [cached, pending] = await Promise.all([
        loadCachedAgents(),
        loadPendingAgents(),
      ]);

      if (cancelled) return;

      if (cached?.agents?.length) {
        internalSetAgents(cached.agents);
        setLastSyncedAt(cached.updatedAt);
      }

      if (pending?.agents?.length) {
        internalSetAgents(pending.agents);
        setHasPendingSync(true);
      }

      initializingRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data || hasPendingSync) return;

    internalSetAgents(data);
    cacheAgents(data).then((payload) => setLastSyncedAt(payload.updatedAt));
  }, [data, hasPendingSync]);

  const syncAgentsWithBackend = useCallback(
    async (payload: Agent[]) => {
      try {
        const response = await fetch('http://localhost:3001/agents/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agents: payload,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed with status ${response.status}`);
        }

        const result = await response.json().catch(() => ({}));
        await clearPendingAgents();
        setHasPendingSync(false);
        setLastSyncedAt(result.syncedAt ?? new Date().toISOString());
        refetch();
      } catch (error) {
        console.error('Failed to sync agents with backend', error);
        await cachePendingAgents(payload);
        setHasPendingSync(true);
      }
    },
    [refetch],
  );

  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;
    (async () => {
      const pending = await loadPendingAgents();
      if (cancelled || !pending?.agents?.length) return;
      setHasPendingSync(true);
      await syncAgentsWithBackend(pending.agents);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline, syncAgentsWithBackend]);

  useEffect(() => {
    if (initializingRef.current) return;

    cacheAgents(agents).catch((error) => {
      console.error('Failed to persist agents cache', error);
    });

    if (!pendingUpdateRef.current) return;

    const executeSync = async () => {
      if (isOnline) {
        await syncAgentsWithBackend(agents);
      } else {
        await cachePendingAgents(agents);
        setHasPendingSync(true);
      }
      pendingUpdateRef.current = false;
    };

    executeSync();
  }, [agents, isOnline, syncAgentsWithBackend]);

  const updateAgents = useCallback<React.Dispatch<React.SetStateAction<Agent[]>>>(
    (value) => {
      pendingUpdateRef.current = true;
      setHasPendingSync(true);

      internalSetAgents((prev) =>
        typeof value === 'function'
          ? (value as (previous: Agent[]) => Agent[])(prev)
          : value,
      );
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      agents,
      setAgents: updateAgents,
      isOnline,
      hasPendingSync,
      lastSyncedAt,
    }),
    [agents, updateAgents, isOnline, hasPendingSync, lastSyncedAt],
  );

  return (
    <AgentsContext.Provider value={contextValue}>
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
