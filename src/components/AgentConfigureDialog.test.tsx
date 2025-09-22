import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import type { Agent } from '@/types/agent';

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
});

describe('AgentConfigureDialog', () => {
  const createAgent = (overrides: Partial<Agent>): Agent => ({
    id: 'agent-id',
    name: 'Default Agent',
    description: 'Default description',
    status: 'active',
    tasksCompleted: 0,
    memoryItems: 0,
    lastActive: 'today',
    ...overrides,
  });

  it('refreshes the form state when different agents are opened in sequence', async () => {
    const user = userEvent.setup();
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

    await user.clear(nameInput);
    await user.type(nameInput, 'Alpha Prime');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');

    await user.click(statusTrigger);
    await user.click(await screen.findByRole('option', { name: 'Inactive' }));
    expect(statusTrigger).toHaveTextContent('Inactive');

    rerender(<AgentConfigureDialog open={false} agent={firstAgent} onClose={onClose} />);
    rerender(<AgentConfigureDialog open agent={secondAgent} onClose={onClose} />);

    const secondNameInput = screen.getByLabelText('Agent Name') as HTMLInputElement;
    const secondDescriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
    const secondStatusTrigger = screen.getByRole('combobox', { name: /status/i });

    expect(secondNameInput.value).toBe('Beta');
    expect(secondDescriptionInput.value).toBe('Second agent');
    expect(secondStatusTrigger).toHaveTextContent('Inactive');

    await user.clear(secondNameInput);
    await user.type(secondNameInput, 'Beta Prime');

    await user.click(secondStatusTrigger);
    await user.click(await screen.findByRole('option', { name: 'Learning' }));

    expect(secondNameInput.value).toBe('Beta Prime');
    expect(secondStatusTrigger).toHaveTextContent('Learning');
  });
});
