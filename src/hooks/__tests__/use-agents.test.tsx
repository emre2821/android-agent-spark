import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AgentsProvider, useAgents } from '@/hooks/use-agents';
import { Agent } from '@/types/agent';

declare global {
  // eslint-disable-next-line no-var
  var WebSocket: typeof MockWebSocket;
}

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send() {}

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  trigger(event: any) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent);
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

globalThis.WebSocket = MockWebSocket as any;

type FetchImpl = typeof fetch;

const successAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: '1',
  name: 'Task Automator',
  description: 'Automates',
  status: 'inactive',
  tasksCompleted: 1,
  memoryItems: 2,
  lastActive: '1 hour ago',
  ...overrides,
});

let agentsStore: Agent[] = [successAgent()];
let fetchMock: ReturnType<typeof vi.fn<FetchImpl>>;
let createResolve: (() => void) | null = null;

const buildResponse = (data: any, status = 200) =>
  new Response(data !== null ? JSON.stringify(data) : null, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const setupFetch = () => {
  fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method ?? 'GET';

    if (url.endsWith('/agents') && method === 'GET') {
      return buildResponse(agentsStore);
    }

    if (url.endsWith('/agents') && method === 'POST') {
      const body = JSON.parse(init?.body as string);
      const newAgent = successAgent({
        id: '2',
        name: body.name,
        description: body.description ?? '',
        status: body.status ?? 'inactive',
        tasksCompleted: 0,
        memoryItems: 0,
        lastActive: 'Just now',
      });
      agentsStore = [...agentsStore, newAgent];
      return new Promise<Response>((resolve) => {
        createResolve = () => resolve(buildResponse(newAgent, 201));
      });
    }

    if (/\/agents\/.+$/.test(url) && method === 'PUT') {
      const [, id] = url.match(/\/agents\/([^/]+)/) ?? [];
      const body = JSON.parse(init?.body as string);
      agentsStore = agentsStore.map((agent) =>
        agent.id === id ? { ...agent, ...body } : agent
      );
      const updated = agentsStore.find((agent) => agent.id === id);
      return buildResponse(updated ?? null);
    }

    if (/\/agents\/.+$/.test(url) && method === 'DELETE') {
      const [, id] = url.match(/\/agents\/([^/]+)/) ?? [];
      agentsStore = agentsStore.filter((agent) => agent.id !== id);
      return new Response(null, { status: 204 });
    }

    if (url.includes('/memory')) {
      return buildResponse([]);
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  }) as any;

  globalThis.fetch = fetchMock as any;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AgentsProvider>{children}</AgentsProvider>
    </QueryClientProvider>
  );

  return { wrapper: Wrapper, queryClient };
};

describe('useAgents hook', () => {
  beforeEach(() => {
    agentsStore = [successAgent()];
    setupFetch();
    MockWebSocket.reset();
    createResolve = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches agents, supports optimistic creation, and reacts to websocket updates', async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useAgents(), { wrapper });

    await waitFor(() => expect(result.current.agents).toHaveLength(1));

    expect(result.current.agents[0].name).toBe('Task Automator');

    await act(async () => {
      const createPromise = result.current.createAgent({
        name: 'New Agent',
        description: 'Test agent',
        status: 'active',
      });

      await waitFor(() => {
        const data = queryClient.getQueryData<Agent[]>(['agents']) ?? [];
        expect(data.some((agent) => agent.name === 'New Agent')).toBe(true);
      });

      createResolve?.();
      await createPromise;
    });

    await waitFor(() =>
      expect(result.current.agents.find((agent) => agent.name === 'New Agent')?.id).toBe('2')
    );

    const socket = MockWebSocket.instances[0];
    const updated = successAgent({ status: 'active' });

    act(() => {
      socket.trigger({ event: 'agent:updated', payload: updated });
    });

    await waitFor(() =>
      expect(result.current.agents.find((agent) => agent.id === '1')?.status).toBe('active')
    );
  });
});
