export type WorkflowRunStatus = 'running' | 'retrying' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowStepLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown> | null;
}

export interface WorkflowStepRetry {
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastReason: string | null;
}

export interface WorkflowStepHistoryEntry {
  status: WorkflowStepStatus | WorkflowRunStatus;
  timestamp: string;
  attempt: number;
  note?: string | null;
}

export interface WorkflowStepError {
  message: string;
  code: string | null;
  attempt: number;
  timestamp: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: WorkflowStepStatus;
  attempt: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  logs: WorkflowStepLog[];
  retry: WorkflowStepRetry;
  error: WorkflowStepError | null;
  history: WorkflowStepHistoryEntry[];
}

export interface WorkflowRetryPolicy {
  strategy: string;
  maxAttempts: number;
  intervalSeconds: number;
}

export interface WorkflowRunHistoryEntry {
  status: WorkflowRunStatus | WorkflowStepStatus;
  timestamp: string;
  note?: string | null;
}

export interface WorkflowRunError {
  stepId: string | null;
  message: string;
  attempt: number;
  timestamp: string;
}

export interface WorkflowRetryEvent {
  attempt: number;
  stepId: string | null;
  scheduledAt: string | null;
  reason: string | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: string;
  status: WorkflowRunStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  currentAttempt: number;
  retryPolicy: WorkflowRetryPolicy;
  history: WorkflowRunHistoryEntry[];
  steps: WorkflowStep[];
  retryHistory: WorkflowRetryEvent[];
  errors: WorkflowRunError[];
  metadata: Record<string, unknown>;
}
