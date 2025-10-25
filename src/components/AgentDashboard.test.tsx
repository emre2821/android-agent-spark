import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AgentDashboard } from './AgentDashboard';

const mockAgents = [
  {
    id: '1',
    name: 'Aurora',
    description: 'First wave automation agent',
    status: 'active' as const,
    tasksCompleted: 4,
    memoryItems: 2,
    lastActive: 'Today'
  },
  {
    id: '2',
    name: 'Borealis',
    description: 'Keeps nightly routines in sync',
    status: 'inactive' as const,
    tasksCompleted: 1,
    memoryItems: 5,
    lastActive: 'Yesterday'
  }
];

const mockSetAgents = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/use-agents', () => ({
  useAgents: () => ({
    agents: mockAgents,
    setAgents: mockSetAgents
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

describe('AgentDashboard', () => {
  beforeEach(() => {
    mockSetAgents.mockReset();
    mockToast.mockReset();
  });

  const renderDashboard = () =>
    render(
      <BrowserRouter>
        <AgentDashboard />
      </BrowserRouter>
    );

  it('filters agents based on the search query', () => {
    renderDashboard();

    expect(screen.getByText('Aurora')).toBeInTheDocument();
    expect(screen.getByText('Borealis')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search agents...'), {
      target: { value: 'Aurora' }
    });

    expect(screen.getByText('Aurora')).toBeInTheDocument();
    expect(screen.queryByText('Borealis')).not.toBeInTheDocument();
  });

  it('creates a new agent and emits a toast notification', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /new agent/i }));

    fireEvent.change(screen.getByLabelText('Agent Name'), {
      target: { value: 'Nova' }
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'A freshly launched assistant' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create agent/i }));

    expect(mockSetAgents).toHaveBeenCalledTimes(1);
    const [agentsArgument] = mockSetAgents.mock.calls[0];
    expect(agentsArgument).toHaveLength(mockAgents.length + 1);
    expect(agentsArgument.at(-1)).toMatchObject({
      name: 'Nova',
      description: 'A freshly launched assistant',
      status: 'active'
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agent Created'
      })
    );
  });

  it('updates an existing agent through the configure dialog', async () => {
    renderDashboard();

    fireEvent.click(screen.getAllByRole('button', { name: /configure/i })[0]);

    const dialogNameInput = await screen.findByLabelText('Agent Name');
    fireEvent.change(dialogNameInput, { target: { value: 'Aurora Prime' } });

    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));

    expect(mockSetAgents).toHaveBeenCalledTimes(1);
    const [updatedAgents] = mockSetAgents.mock.calls[0];
    expect(updatedAgents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '1', name: 'Aurora Prime' })
      ])
    );

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agent Updated'
      })
    );
  });
});
