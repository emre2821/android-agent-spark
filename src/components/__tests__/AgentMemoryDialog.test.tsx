import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { AgentMemoryDialog } from '@/components/AgentMemoryDialog';

const fetchAgentMemory = vi.fn<[string], Promise<any[]>>();
const addMemoryItem = vi.fn();
const updateMemoryItem = vi.fn();
const deleteMemoryItem = vi.fn();
const toast = vi.fn();

vi.mock('@/hooks/use-agents', () => ({
  useAgents: () => ({
    fetchAgentMemory,
    addMemoryItem,
    updateMemoryItem,
    deleteMemoryItem,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

describe('AgentMemoryDialog', () => {
  beforeEach(() => {
    fetchAgentMemory.mockReset();
    addMemoryItem.mockReset();
    updateMemoryItem.mockReset();
    deleteMemoryItem.mockReset();
    toast.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays the memory list for the active agent without leaking between agents', async () => {
    const memoryByAgent: Record<string, any[]> = {
      'agent-1': [
        { id: 'm1', key: 'favorite_tea', value: 'Enjoys Earl Grey', type: 'preference' },
      ],
      'agent-2': [
        { id: 'm2', key: 'favorite_coffee', value: 'Prefers Espresso', type: 'preference' },
      ],
    };

    fetchAgentMemory.mockImplementation(async (id: string) => memoryByAgent[id] ?? []);

    const { rerender } = render(
      <AgentMemoryDialog open agentId="agent-1" onClose={() => {}} />
    );

    await waitFor(() => expect(screen.getByText('Enjoys Earl Grey')).toBeInTheDocument());
    expect(screen.queryByText('Prefers Espresso')).not.toBeInTheDocument();
    expect(fetchAgentMemory).toHaveBeenCalledWith('agent-1');

    rerender(<AgentMemoryDialog open agentId="agent-2" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('Prefers Espresso')).toBeInTheDocument());
    expect(screen.queryByText('Enjoys Earl Grey')).not.toBeInTheDocument();
    expect(fetchAgentMemory).toHaveBeenLastCalledWith('agent-2');
  });
});
