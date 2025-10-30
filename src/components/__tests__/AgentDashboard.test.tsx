import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AgentsProvider } from '@/hooks/use-agents';
import { AgentDashboard } from '@/components/AgentDashboard';
import { Agent } from '@/types/agent';
import * as toastModule from '@/hooks/use-toast';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  static OPEN = 1;

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

  close() {}

  trigger(event: any) {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent);
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

const globalWithSocket = globalThis as typeof globalThis & { WebSocket: typeof WebSocket };
const originalWebSocket = globalWithSocket.WebSocket;
globalWithSocket.WebSocket = MockWebSocket as unknown as typeof WebSocket;

const baseAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: '1',
  name: 'Task Automator',
  description: 'Automates',
  status: 'inactive',
  tasksCompleted: 1,
  memoryItems: 2,
  lastActive: '1 hour ago',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

let agentsStore: Agent[] = [baseAgent()];
const buildResponse = (data: any, status = 200) =>
  new Response(data !== null ? JSON.stringify(data) : null, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let toastSpy: ReturnType<typeof vi.fn>;

const setupFetch = () => {
  const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method ?? 'GET';

    if (url.endsWith('/agents') && method === 'GET') {
      return buildResponse(agentsStore);
    }

    if (url.endsWith('/agents') && method === 'POST') {
      const body = JSON.parse(init?.body as string);
      const newAgent = baseAgent({
        id: '2',
        name: body.name,
        description: body.description ?? '',
        status: body.status ?? 'inactive',
        tasksCompleted: 0,
        memoryItems: 0,
        lastActive: 'Just now',
      });
      agentsStore = [...agentsStore, newAgent];
      return buildResponse(newAgent, 201);
    }

    if (url.includes('/memory')) {
      return buildResponse([]);
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  globalThis.fetch = fetchMock as any;
  return fetchMock;
};

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AgentsProvider>
          <AgentDashboard />
        </AgentsProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AgentDashboard', () => {
  beforeEach(() => {
    agentsStore = [baseAgent()];
    setupFetch();
    MockWebSocket.reset();
    toastSpy = vi.fn();
    vi.spyOn(toastModule, 'useToast').mockReturnValue({ toast: toastSpy } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    globalWithSocket.WebSocket = originalWebSocket;
  });

  it('creates agents through the dialog and shows success toast', async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByText('AI Agent Dashboard')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Task Automator')).toBeInTheDocument());

    fireEvent.click(screen.getByText('New Agent'));

    const nameInput = await screen.findByPlaceholderText('Enter agent name...');
    fireEvent.change(nameInput, { target: { value: 'Fresh Agent' } });

    const descriptionInput = screen.getByPlaceholderText('Describe what this agent will do...');
    fireEvent.change(descriptionInput, { target: { value: 'Helps with tasks' } });

    fireEvent.click(screen.getByText('Create Agent'));

    await waitFor(() => expect(screen.getByText('Fresh Agent')).toBeInTheDocument());
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Agent Created' })
      )
    );
  });

  it('updates when websocket pushes agent changes', async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByText('Task Automator')).toBeInTheDocument());

    const socket = MockWebSocket.instances[0];
    const updated = baseAgent({ status: 'active' });

    act(() => {
      socket.trigger({ event: 'agent:updated', payload: updated });
    });

    await waitFor(() => expect(screen.getAllByText('active').length).toBeGreaterThan(0));
  });
});
