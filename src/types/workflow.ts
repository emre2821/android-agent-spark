export type WorkflowVersionStatus = "draft" | "published" | "archived";

export interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
}

export interface WorkflowVersion {
  id: string;
  number: number;
  status: WorkflowVersionStatus;
  author: string;
  changeSummary: string;
  createdAt: string;
  updatedAt: string;
  definition: WorkflowDefinition;
}

export interface WorkflowHistoryEntry {
  id: string;
  versionId: string;
  versionNumber: number;
  author: string;
  action: string;
  summary: string;
  timestamp: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  createdAt: string;
  updatedAt: string;
  publishedVersionId: string | null;
  versions: WorkflowVersion[];
  history: WorkflowHistoryEntry[];
}

export interface WorkflowDiffChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface WorkflowDiff {
  metadataChanges: WorkflowDiffChange[];
  addedSteps: WorkflowStep[];
  removedSteps: WorkflowStep[];
  changedSteps: Array<{
    id: string;
    name: string;
    changes: WorkflowDiffChange[];
  }>;
}

export interface WorkflowCreatePayload {
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  author: string;
  changeSummary: string;
}

export interface WorkflowVersionPayload {
  definition: WorkflowDefinition;
  author: string;
  changeSummary: string;
}

