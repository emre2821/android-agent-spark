import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { buildApiUrl } from "@/lib/api/config";
import { fetchJson, withAuthContext } from "@/lib/api/fetch";
import { getStoredWorkspaceId } from "@/lib/auth/storage";
import { getCachedWorkflows, persistWorkflows } from "@/lib/offline-storage";
import { useAuth } from "./use-auth";
import {
  Workflow,
  WorkflowCreatePayload,
  WorkflowDiff,
  WorkflowVersion,
  WorkflowVersionPayload,
  type StoredWorkflow,
} from "@/types/workflow";
export {
  WorkflowsProvider,
  createInMemoryWorkflowsManager,
  useWorkflows,
} from "./use-workflows-context";
export type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowUpsert,
  WorkflowsManager,
} from "./use-workflows-context";

const requireWorkspaceId = (workspaceId?: string | null) => {
  const resolved = workspaceId ?? getStoredWorkspaceId();
  if (!resolved) {
    throw new Error("Workspace ID is not set.");
  }
  return resolved;
};

const buildWorkspaceUrl = (workspaceId: string, path: string) =>
  buildApiUrl(`/workspaces/${workspaceId}${path}`);

export const useWorkflowList = (enabled: boolean) => {
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useQuery<Workflow[]>({
    queryKey: ["workflows", workspaceId],
    queryFn: () => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<Workflow[]>(buildWorkspaceUrl(id, "/workflows"), {
        headers: { "X-Workspace-Id": id },
      });
    },
    enabled: Boolean(enabled && workspaceId),
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: (payload: WorkflowCreatePayload) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<{ workflow: Workflow; version: WorkflowVersion }>(
        buildWorkspaceUrl(id, "/workflows"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const useCreateWorkflowVersion = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: ({ workflowId, payload }: { workflowId: string; payload: WorkflowVersionPayload }) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<{ workflow: Workflow; version: WorkflowVersion }>(
        buildWorkspaceUrl(id, `/workflows/${workflowId}/versions`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const useUpdateWorkflowVersion = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: ({
      workflowId,
      versionId,
      payload,
    }: {
      workflowId: string;
      versionId: string;
      payload: Partial<WorkflowVersionPayload>;
    }) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<WorkflowVersion>(
        buildWorkspaceUrl(id, `/workflows/${workflowId}/versions/${versionId}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const useDuplicateWorkflowVersion = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: ({
      workflowId,
      versionId,
      author,
      changeSummary,
    }: {
      workflowId: string;
      versionId: string;
      author: string;
      changeSummary: string;
    }) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<WorkflowVersion>(
        buildWorkspaceUrl(id, `/workflows/${workflowId}/versions/${versionId}/duplicate`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
          body: JSON.stringify({ author, changeSummary }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const useRevertWorkflowVersion = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: ({
      workflowId,
      versionId,
      author,
      changeSummary,
    }: {
      workflowId: string;
      versionId: string;
      author: string;
      changeSummary: string;
    }) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<WorkflowVersion>(
        buildWorkspaceUrl(id, `/workflows/${workflowId}/versions/${versionId}/revert`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
          body: JSON.stringify({ author, changeSummary }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const usePublishWorkflowVersion = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: ({
      workflowId,
      versionId,
      author,
      changeSummary,
    }: {
      workflowId: string;
      versionId: string;
      author: string;
      changeSummary: string;
    }) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<WorkflowVersion>(
        buildWorkspaceUrl(id, `/workflows/${workflowId}/versions/${versionId}/publish`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
          body: JSON.stringify({ author, changeSummary }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const useImportWorkflows = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id ?? getStoredWorkspaceId();

  return useMutation({
    mutationFn: ({ content, format }: { content: string; format: "json" | "yaml" }) => {
      const id = requireWorkspaceId(workspaceId);
      return fetchJson<Workflow[]>(buildWorkspaceUrl(id, "/workflows/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Workspace-Id": id },
        body: JSON.stringify({ content, format }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", workspaceId] });
    },
  });
};

export const fetchWorkflowDiff = async (
  workflowId: string,
  fromVersionId: string | null,
  toVersionId: string,
): Promise<WorkflowDiff> => {
  const workspaceId = requireWorkspaceId();
  const params = new URLSearchParams();
  params.set("to", toVersionId);
  if (fromVersionId) {
    params.set("from", fromVersionId);
  }
  return fetchJson<WorkflowDiff>(
    buildWorkspaceUrl(workspaceId, `/workflows/${workflowId}/diff?${params.toString()}`),
    { headers: { "X-Workspace-Id": workspaceId } },
  );
};

export const exportWorkflowPayload = async (
  workflowId: string,
  options: { versionId?: string; format: "json" | "yaml" },
): Promise<string> => {
  const workspaceId = requireWorkspaceId();
  const params = new URLSearchParams();
  params.set("format", options.format);
  if (options.versionId) {
    params.set("versionId", options.versionId);
  }
  const response = await fetch(
    buildWorkspaceUrl(workspaceId, `/workflows/${workflowId}/export?${params.toString()}`),
    withAuthContext({ headers: { "X-Workspace-Id": workspaceId } }),
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to export workflow");
  }
  return response.text();
};

interface WorkflowCache {
  workflows: StoredWorkflow[];
  addWorkflow: (workflow: StoredWorkflow) => void;
  removeWorkflow: (workflowId: string) => void;
}

export const useWorkflowCache = (): WorkflowCache => {
  const [workflows, setWorkflows] = useState<StoredWorkflow[]>([]);

  useEffect(() => {
    let mounted = true;
    getCachedWorkflows().then((cached) => {
      if (mounted && cached) {
        setWorkflows(cached);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const addWorkflow = useCallback(
    (workflow: StoredWorkflow) => {
      setWorkflows((previous) => {
        const next = [workflow, ...previous];
        void persistWorkflows(next);
        return next;
      });
    },
    [],
  );

  const removeWorkflow = useCallback(
    (workflowId: string) => {
      setWorkflows((previous) => {
        const next = previous.filter((workflow) => workflow.id !== workflowId);
        void persistWorkflows(next);
        return next;
      });
    },
    [],
  );

  return { workflows, addWorkflow, removeWorkflow };
};
