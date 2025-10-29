import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { TOKEN_STORAGE_KEY, WORKSPACE_STORAGE_KEY } from '@/lib/auth/storage';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

type WorkspaceSummary = {
  id: string;
  name: string;
  description?: string;
  role: Role;
  summary?: {
    agentCount: number;
    workflowCount: number;
    credentialCount: number;
    runCount: number;
  } | null;
};

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthenticatedUser | null;
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  currentRole: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setWorkspace: (workspaceId: string) => void;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(() =>
    localStorage.getItem(WORKSPACE_STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(token));

  const persistWorkspaceId = useCallback((workspaceId: string | null) => {
    if (workspaceId) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    persistWorkspaceId(null);
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspaceId(null);
    setIsLoading(false);
  }, [persistWorkspaceId]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load profile.');
        }

        const data = await response.json();
        setUser(data.user);
        setWorkspaces(data.workspaces ?? []);
        setCurrentWorkspaceId((previous) => {
          const workspaceIds = (data.workspaces ?? []).map((item: WorkspaceSummary) => item.id);
          const nextId = previous && workspaceIds.includes(previous)
            ? previous
            : workspaceIds[0] ?? null;
          persistWorkspaceId(nextId);
          return nextId;
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          logout();
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => controller.abort();
  }, [token, logout, persistWorkspaceId]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const { message } = await response.json().catch(() => ({ message: 'Unable to login.' }));
      throw new Error(message ?? 'Unable to login.');
    }

    const data = await response.json();
    const workspaceId = data.workspaces?.[0]?.id ?? null;

    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setWorkspaces(data.workspaces ?? []);
    setCurrentWorkspaceId(workspaceId);
    persistWorkspaceId(workspaceId);
  }, [persistWorkspaceId]);

  const setWorkspace = useCallback(
    (workspaceId: string) => {
      const exists = workspaces.some((workspace) => workspace.id === workspaceId);
      if (!exists) {
        return;
      }
      setCurrentWorkspaceId(workspaceId);
      persistWorkspaceId(workspaceId);
    },
    [workspaces, persistWorkspaceId],
  );

  const value = useMemo<AuthContextValue>(() => {
    const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? null;
    return {
      token,
      user,
      workspaces,
      currentWorkspace,
      currentRole: currentWorkspace?.role ?? null,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      setWorkspace,
    };
  }, [token, user, workspaces, currentWorkspaceId, isLoading, login, logout, setWorkspace]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
