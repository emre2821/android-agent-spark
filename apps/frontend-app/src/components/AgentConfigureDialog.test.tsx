import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import type { Agent } from '@/types/agent';
import { vi } from 'vitest';

const updateAgentMock = vi.fn();

vi.mock('@/hooks/use-agents', () => ({
  useAgents: () => ({
    updateAgent: updateAgentMock,
  }),
}));

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => {},
  });
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => {},
  });
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const globalWithResize = globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver };
  globalWithResize.ResizeObserver = ResizeObserver;
});

describe('AgentConfigureDialog', () => {
  beforeEach(() => {
    updateAgentMock.mockReset();
    updateAgentMock.mockResolvedValue(undefined);
  });

  const createAgent = (overrides: Partial<Agent>): Agent => ({
    id: 'agent-id',
    name: 'Default Agent',
    description: 'Default description',
    status: 'active',
    tasksCompleted: 0,
    memoryItems: 0,
    lastActive: 'today',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  it('refreshes the form state when different agents are opened in sequence', async () => {
    const onClose = vi.fn();

    const firstAgent = createAgent({
      id: 'agent-1',
      name: 'Alpha',
      description: 'First agent',
      status: 'active',
    });
    const secondAgent = createAgent({
      id: 'agent-2',
      name: 'Beta',
      description: 'Second agent',
      status: 'inactive',
    });

    const { rerender } = render(
      <AgentConfigureDialog open agent={firstAgent} onClose={onClose} />
    );

    const nameInput = screen.getByLabelText('Agent Name') as HTMLInputElement;
    const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
    const statusTrigger = screen.getByRole('combobox', { name: /status/i });

    expect(nameInput.value).toBe('Alpha');
    expect(descriptionInput.value).toBe('First agent');
    expect(statusTrigger).toHaveTextContent('Active');

    fireEvent.change(nameInput, { target: { value: 'Alpha Prime' } });
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

    fireEvent.mouseDown(statusTrigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Inactive' }));
    expect(statusTrigger).toHaveTextContent('Inactive');

    rerender(<AgentConfigureDialog open={false} agent={firstAgent} onClose={onClose} />);
    rerender(<AgentConfigureDialog open agent={secondAgent} onClose={onClose} />);

    const secondNameInput = screen.getByLabelText('Agent Name') as HTMLInputElement;
    const secondDescriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
    const secondStatusTrigger = screen.getByRole('combobox', { name: /status/i });

    expect(secondNameInput.value).toBe('Beta');
    expect(secondDescriptionInput.value).toBe('Second agent');
    expect(secondStatusTrigger).toHaveTextContent('Inactive');

    fireEvent.change(secondNameInput, { target: { value: 'Beta Prime' } });

    fireEvent.mouseDown(secondStatusTrigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Learning' }));

    expect(secondNameInput.value).toBe('Beta Prime');
    expect(secondStatusTrigger).toHaveTextContent('Learning');
  });
});
