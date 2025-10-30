import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AgentCard } from './AgentCard';
import type { Agent } from '@/types/agent';

const createAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'agent-1',
  name: 'Test Agent',
  description: 'An example agent',
  status: 'active',
  tasksCompleted: 3,
  memoryItems: 5,
  lastActive: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('AgentCard', () => {
  it('renders agent details', () => {
    const agent = createAgent();
    render(
      <BrowserRouter>
        <AgentCard
          agent={agent}
          onEdit={() => {}}
          onViewMemory={() => {}}
        />
      </BrowserRouter>,
    );

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Tasks:')).toBeInTheDocument();
    expect(screen.getByText('Memory:')).toBeInTheDocument();
  });

  it('calls handlers when buttons are clicked', () => {
    const agent = createAgent();
    const onEdit = vi.fn();
    const onViewMemory = vi.fn();
    const onBuildWorkflow = vi.fn();

    render(
      <BrowserRouter>
        <AgentCard
          agent={agent}
          onEdit={onEdit}
          onViewMemory={onViewMemory}
          onBuildWorkflow={onBuildWorkflow}
        />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /configure/i }));
    fireEvent.click(screen.getByRole('button', { name: /memory/i }));
    fireEvent.click(screen.getByRole('button', { name: /workflows/i }));

    expect(onEdit).toHaveBeenCalledWith(agent.id);
    expect(onViewMemory).toHaveBeenCalledWith(agent.id);
    expect(onBuildWorkflow).toHaveBeenCalledWith(agent.id);
  });

  it('disables restricted actions based on permissions', () => {
    const agent = createAgent();
    render(
      <BrowserRouter>
        <AgentCard
          agent={agent}
          canConfigure={false}
          canViewMemory={false}
          onEdit={() => {}}
          onViewMemory={() => {}}
        />
      </BrowserRouter>,
    );

    expect(screen.getByRole('button', { name: /configure/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /memory/i })).toBeDisabled();
  });
});
