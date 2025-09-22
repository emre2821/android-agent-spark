import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AgentCard } from './AgentCard';

describe('AgentCard', () => {
  const agent = {
    id: '1',
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
        <AgentCard agent={agent} onEdit={() => {}} onViewMemory={() => {}} onBuildWorkflow={() => {}} />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Tasks:')).toBeInTheDocument();
  });

  it('calls onEdit when Configure button clicked', () => {
    const onEdit = vi.fn();
    render(
      <BrowserRouter>
        <AgentCard agent={agent} onEdit={onEdit} onViewMemory={() => {}} onBuildWorkflow={() => {}} />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText('Configure'));
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
