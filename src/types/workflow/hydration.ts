import { DEFAULT_STEP_POSITION } from './core';
import type {
  WorkflowExecutionState,
  WorkflowMetadata,
  WorkflowPosition,
} from './core';

export const ensureArray = <T>(value?: readonly T[] | null): T[] =>
  Array.isArray(value) ? Array.from(value) : [];

export const ensureRecord = <T extends Record<string, unknown>>(value?: T | null): T =>
  ({ ...(value ?? {}) } as T);

export const ensurePosition = (position?: WorkflowPosition | null): WorkflowPosition => ({
  x: position?.x ?? DEFAULT_STEP_POSITION.x,
  y: position?.y ?? DEFAULT_STEP_POSITION.y,
});

export const ensureExecutionState = (
  execution?: Partial<WorkflowExecutionState> | null,
): WorkflowExecutionState => ({
  runCount: execution?.runCount ?? 0,
  lastRunStatus: execution?.lastRunStatus ?? 'idle',
  lastRunAt: execution?.lastRunAt ?? null,
  schedule: execution?.schedule,
});

export const ensureMetadata = (metadata?: WorkflowMetadata | null): WorkflowMetadata => {
  const base = ensureRecord<WorkflowMetadata>(metadata);
  return {
    ...base,
    tags: ensureArray(base.tags),
  };
};
