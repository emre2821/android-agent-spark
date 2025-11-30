import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './use-auth';

const originalFetch = global.fetch;

describe('useAuth', () => {
  const loginResponse = {
    token: 'token-123',
    user: {
      id: 'user-avery',
      name: 'Avery Quinn',
      email: 'avery.owner@example.com',
    },
    workspaces: [
      {
        id: 'workspace-aurora',
        name: 'Aurora Research Lab',
        role: 'owner' as const,
        summary: {
          agentCount: 3,
          workflowCount: 2,
          credentialCount: 2,
          runCount: 3,
        },
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('logs in and stores the session token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: loginResponse.user,
            workspaces: loginResponse.workspaces,
          }),
      });

    const globalWithFetch = globalThis as typeof globalThis & { fetch: typeof fetch };
    globalWithFetch.fetch = fetchMock as typeof fetch;

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('avery.owner@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(localStorage.getItem('eden_auth_token')).toBe('token-123');
    expect(result.current.user?.email).toBe('avery.owner@example.com');
    expect(result.current.currentWorkspace?.id).toBe('workspace-aurora');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-123' }) }),
    );
  });

  it('surface errors when login fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    const globalWithFetch = globalThis as typeof globalThis & { fetch: typeof fetch };
    globalWithFetch.fetch = fetchMock as typeof fetch;

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(result.current.login('avery.owner@example.com', 'wrong')).rejects.toThrow(
      'Invalid credentials',
    );
    expect(localStorage.getItem('eden_auth_token')).toBeNull();
  });
});
