import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AgentCard } from './AgentCard';

describe('AgentCard', () => {
  const agent = {
    id: '1',
    workspaceId: 'workspace-aurora',
    name: 'Test Agent',
    description: 'An example agent',
    status: 'active' as const,
    tasksCompleted: 3,
    memoryItems: 5,
    lastActive: 'today'
  };

  it('renders agent information', () => {
    render(
      <BrowserRouter>
        <AgentCard
          agent={agent}
          canConfigure
          canViewMemory
          onEdit={() => {}}
          onViewMemory={() => {}}
        />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Tasks:')).toBeInTheDocument();
  });

  it('calls onEdit when Configure button clicked', () => {
    const onEdit = vi.fn();
    render(
      <BrowserRouter>
        <AgentCard
          agent={agent}
          canConfigure
          canViewMemory
          onEdit={onEdit}
          onViewMemory={() => {}}
        />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText('Configure'));
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('disables restricted actions when permissions are missing', () => {
    const onEdit = vi.fn();
    const onViewMemory = vi.fn();
    render(
      <BrowserRouter>
        <AgentCard
          agent={agent}
          canConfigure={false}
          canViewMemory={false}
          onEdit={onEdit}
          onViewMemory={onViewMemory}
        />
      </BrowserRouter>
    );

    const configureButton = screen.getByText('Configure');
    const memoryButton = screen.getByText('Memory');

    expect(configureButton).toBeDisabled();
    expect(memoryButton).toBeDisabled();

    fireEvent.click(configureButton);
    fireEvent.click(memoryButton);

    expect(onEdit).not.toHaveBeenCalled();
    expect(onViewMemory).not.toHaveBeenCalled();
  });
});
