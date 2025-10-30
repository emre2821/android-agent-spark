import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { AgentMemoryDialog } from '@/components/AgentMemoryDialog';

const fetchAgentMemory = vi.fn<(id: string) => Promise<any[]>>();
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

  describe('error handling', () => {
    it('shows error toast when addMemoryItem fails and keeps dialog open', async () => {
      fetchAgentMemory.mockResolvedValue([]);
      addMemoryItem.mockRejectedValueOnce(new Error('Add failed'));
      const onClose = vi.fn();

      render(<AgentMemoryDialog open agentId="agent-1" onClose={onClose} />);

      await waitFor(() => expect(fetchAgentMemory).toHaveBeenCalledWith('agent-1'));

      fireEvent.change(screen.getByPlaceholderText(/memory key/i), {
        target: { value: 'test_key' },
      });
      fireEvent.change(screen.getByPlaceholderText(/memory value or description/i), {
        target: { value: 'Test memory' },
      });
      fireEvent.click(screen.getByRole('button', { name: /add memory/i }));

      await waitFor(() => expect(addMemoryItem).toHaveBeenCalled());
      await waitFor(() => expect(toast).toHaveBeenCalled());

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unable to add memory',
          description: 'Add failed',
          variant: 'destructive',
        }),
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows error toast when updateMemoryItem fails and keeps dialog open', async () => {
      fetchAgentMemory.mockResolvedValue([
        {
          id: 'm1',
          agentId: 'agent-1',
          key: 'favorite_tea',
          value: 'Enjoys Earl Grey',
          type: 'preference',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]);
      updateMemoryItem.mockRejectedValueOnce(new Error('Update failed'));
      const onClose = vi.fn();

      render(<AgentMemoryDialog open agentId="agent-1" onClose={onClose} />);

      await screen.findByText('Enjoys Earl Grey');

      fireEvent.click(screen.getByTestId('edit-memory-0'));

      fireEvent.change(screen.getByDisplayValue('Enjoys Earl Grey'), {
        target: { value: 'Updated memory' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(updateMemoryItem).toHaveBeenCalled());
      await waitFor(() => expect(toast).toHaveBeenCalled());

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unable to update memory',
          description: 'Update failed',
          variant: 'destructive',
        }),
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Updated memory')).toBeInTheDocument();
    });

    it('shows error toast when deleteMemoryItem fails and keeps dialog open', async () => {
      fetchAgentMemory.mockResolvedValue([
        {
          id: 'm1',
          agentId: 'agent-1',
          key: 'favorite_tea',
          value: 'Enjoys Earl Grey',
          type: 'preference',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]);
      deleteMemoryItem.mockRejectedValueOnce(new Error('Delete failed'));
      const onClose = vi.fn();

      render(<AgentMemoryDialog open agentId="agent-1" onClose={onClose} />);

      await screen.findByText('Enjoys Earl Grey');

      fireEvent.click(screen.getByTestId('delete-memory-0'));

      await waitFor(() => expect(deleteMemoryItem).toHaveBeenCalled());
      await waitFor(() => expect(toast).toHaveBeenCalled());

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unable to delete memory',
          description: 'Delete failed',
          variant: 'destructive',
        }),
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Enjoys Earl Grey')).toBeInTheDocument();
    });
  });
});
