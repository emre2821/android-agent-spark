import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Workflow } from '@/types/workflow';
import {
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type WorkflowsController,
  type WorkflowsManager,
  createInMemoryWorkflowsManager,
  createWorkflowsManager,
} from '@/lib/workflows/controller';
import {
  type WorkflowUpsert,
  createWorkflowService,
} from '@/lib/workflows/service';

interface WorkflowServiceState {
  getWorkflowById: (workflowId: string) => Workflow | undefined;
  saveWorkflow: (payload: WorkflowUpsert) => Promise<Workflow>;
  publishWorkflow: (workflowId: string) => Promise<Workflow>;
  duplicateWorkflow: (workflowId: string) => Promise<Workflow>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  isSaving: boolean;
  isPublishing: boolean;
  isDuplicating: boolean;
  isDeleting: boolean;
}

interface WorkflowsContextValue extends WorkflowsManager, WorkflowServiceState {
  workflows: Workflow[];
}

const WorkflowsContext = createContext<WorkflowsContextValue | undefined>(undefined);

export const WorkflowsProvider = ({ children }: { children: React.ReactNode }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const controller = useMemo<WorkflowsController>(
    () => ({
      getWorkflows: () => workflows,
      setWorkflows,
    }),
    [workflows, setWorkflows],
  );

  const manager = useMemo(() => createWorkflowsManager(controller), [controller]);
  const service = useMemo(() => createWorkflowService(controller), [controller]);

  const getWorkflowById = useCallback(
    (workflowId: string) => service.getWorkflowById(workflowId),
    [service],
  );

  const saveWorkflow = useCallback(
    async (payload: WorkflowUpsert) => {
      setIsSaving(true);
      try {
        return await service.saveWorkflow(payload);
      } finally {
        setIsSaving(false);
      }
    },
    [service],
  );

  const publishWorkflow = useCallback(
    async (workflowId: string) => {
      setIsPublishing(true);
      try {
        return await service.publishWorkflow(workflowId);
      } finally {
        setIsPublishing(false);
      }
    },
    [service],
  );

  const duplicateWorkflow = useCallback(
    async (workflowId: string) => {
      setIsDuplicating(true);
      try {
        return await service.duplicateWorkflow(workflowId);
      } finally {
        setIsDuplicating(false);
      }
    },
    [service],
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      setIsDeleting(true);
      try {
        await service.deleteWorkflow(workflowId);
      } finally {
        setIsDeleting(false);
      }
    },
    [service],
  );

  const value = useMemo<WorkflowsContextValue>(
    () => ({
      workflows,
      ...manager,
      getWorkflowById,
      saveWorkflow,
      publishWorkflow,
      duplicateWorkflow,
      deleteWorkflow,
      isSaving,
      isPublishing,
      isDuplicating,
      isDeleting,
    }),
    [
      deleteWorkflow,
      duplicateWorkflow,
      getWorkflowById,
      isDeleting,
      isDuplicating,
      isPublishing,
      isSaving,
      manager,
      publishWorkflow,
      saveWorkflow,
      workflows,
    ],
  );

  return <WorkflowsContext.Provider value={value}>{children}</WorkflowsContext.Provider>;
};

export const useWorkflows = () => {
  const context = useContext(WorkflowsContext);
  if (!context) {
    throw new Error('useWorkflows must be used within WorkflowsProvider');
  }
  return context;
};

export { createInMemoryWorkflowsManager };
export type { CreateWorkflowInput, UpdateWorkflowInput, WorkflowsManager, WorkflowUpsert };
