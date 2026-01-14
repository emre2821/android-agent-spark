import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkflowBuilder from '../WorkflowBuilder';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('WorkflowBuilder', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (!init || !init.method || init.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        }) as unknown as Promise<Response>;
      }

      if (url.endsWith('/workflows') && init.method === 'POST') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...body,
            id: body.id || 'wf-generated',
            createdAt: body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            execution: {
              runCount: body.execution?.runCount ?? 0,
              lastRunAt: body.execution?.lastRunAt,
              nextRunAt: body.execution?.nextRunAt,
              schedule: body.execution?.schedule,
              lastRunStatus: body.execution?.lastRunStatus ?? 'idle',
            },
            metadata: {
              tags: body.metadata?.tags ?? [],
              owner: body.metadata?.owner,
              category: body.metadata?.category,
            },
          }),
        }) as unknown as Promise<Response>;
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      }) as unknown as Promise<Response>;
    }) as typeof global.fetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
    global.fetch = originalFetch;
  });

  const renderBuilder = () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/workflows/builder?mode=new']}>
          <Routes>
            <Route path="/workflows/builder" element={<WorkflowBuilder />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('adds steps and saves the workflow', async () => {
    renderBuilder();

    const addStepButton = await screen.findByRole('button', { name: /add step/i });
    fireEvent.click(addStepButton);

    const stepInput = await screen.findByPlaceholderText('Step name');
    fireEvent.change(stepInput, { target: { value: 'Review request' } });

    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
