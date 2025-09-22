import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Workflow,
  WorkflowCreatePayload,
  WorkflowDiff,
  WorkflowVersion,
  WorkflowVersionPayload,
} from "@/types/workflow";

const API_BASE = "http://localhost:3001";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
};

const postJson = async <T>(url: string, body: unknown, method: "POST" | "PATCH" = "POST") => {
  return fetchJson<T>(url, {
    method,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
};

export const useWorkflowList = (enabled: boolean) => {
  return useQuery<Workflow[]>({
    queryKey: ["workflows"],
    queryFn: () => fetchJson<Workflow[]>(`${API_BASE}/workflows`),
    enabled,
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkflowCreatePayload) =>
      postJson<{ workflow: Workflow; version: WorkflowVersion }>(`${API_BASE}/workflows`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const useCreateWorkflowVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowId, payload }: { workflowId: string; payload: WorkflowVersionPayload }) =>
      postJson<{ workflow: Workflow; version: WorkflowVersion }>(
        `${API_BASE}/workflows/${workflowId}/versions`,
        payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const useUpdateWorkflowVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workflowId,
      versionId,
      payload,
    }: {
      workflowId: string;
      versionId: string;
      payload: Partial<WorkflowVersionPayload>;
    }) =>
      postJson<WorkflowVersion>(
        `${API_BASE}/workflows/${workflowId}/versions/${versionId}`,
        payload,
        "PATCH",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const useDuplicateWorkflowVersion = () => {
  const queryClient = useQueryClient();
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
    }) =>
      postJson<WorkflowVersion>(
        `${API_BASE}/workflows/${workflowId}/versions/${versionId}/duplicate`,
        { author, changeSummary },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const useRevertWorkflowVersion = () => {
  const queryClient = useQueryClient();
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
    }) =>
      postJson<WorkflowVersion>(
        `${API_BASE}/workflows/${workflowId}/versions/${versionId}/revert`,
        { author, changeSummary },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const usePublishWorkflowVersion = () => {
  const queryClient = useQueryClient();
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
    }) =>
      postJson<WorkflowVersion>(
        `${API_BASE}/workflows/${workflowId}/versions/${versionId}/publish`,
        { author, changeSummary },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const useImportWorkflows = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, format }: { content: string; format: "json" | "yaml" }) =>
      postJson<Workflow[]>(`${API_BASE}/workflows/import`, { content, format }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};

export const fetchWorkflowDiff = async (
  workflowId: string,
  fromVersionId: string | null,
  toVersionId: string,
): Promise<WorkflowDiff> => {
  const params = new URLSearchParams();
  params.set("to", toVersionId);
  if (fromVersionId) {
    params.set("from", fromVersionId);
  }
  return fetchJson<WorkflowDiff>(`${API_BASE}/workflows/${workflowId}/diff?${params.toString()}`);
};

export const exportWorkflowPayload = async (
  workflowId: string,
  options: { versionId?: string; format: "json" | "yaml" },
): Promise<string> => {
  const params = new URLSearchParams();
  params.set("format", options.format);
  if (options.versionId) {
    params.set("versionId", options.versionId);
  }
  const response = await fetch(`${API_BASE}/workflows/${workflowId}/export?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to export workflow");
  }
  return response.text();
};

