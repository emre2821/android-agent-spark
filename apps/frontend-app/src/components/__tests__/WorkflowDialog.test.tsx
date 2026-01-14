import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkflowDialog } from '../WorkflowDialog';

const publishMock = vi.fn().mockResolvedValue(undefined);
const duplicateMock = vi.fn().mockResolvedValue(undefined);
const deleteMock = vi.fn().mockResolvedValue(undefined);
const navigateMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/hooks/use-workflows', () => ({
  useWorkflows: () => ({
    workflows: [
      {
        id: 'wf-1',
        name: 'Sample Workflow',
        description: 'Test description',
        status: 'draft',
        version: 1,
        triggerId: 'node-1',
        nodes: [],
        edges: [],
        inputs: [],
        outputs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        execution: {
          runCount: 0,
          schedule: '0 9 * * 1',
        },
        metadata: {
          tags: ['alpha'],
        },
      },
    ],
    isLoading: false,
    publishWorkflow: publishMock,
    duplicateWorkflow: duplicateMock,
    deleteWorkflow: deleteMock,
    isPublishing: false,
    isDuplicating: false,
    isDeleting: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('WorkflowDialog', () => {
  beforeEach(() => {
    publishMock.mockClear();
    duplicateMock.mockClear();
    deleteMock.mockClear();
    navigateMock.mockClear();
    toastMock.mockClear();
  });

  it('navigates to the builder when editing a workflow', () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <WorkflowDialog open onClose={onClose} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/workflows/builder?workflowId=wf-1');
  });

  it('publishes a workflow', async () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <WorkflowDialog open onClose={onClose} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => {
      expect(publishMock).toHaveBeenCalledWith('wf-1');
    });
  });
});
