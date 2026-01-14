import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';

import { WorkflowStore } from '../../server/workflowStore.js';

let tempDir: string;
let store: WorkflowStore;
let dataPath: string;

describe('WorkflowStore', () => {
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'workflow-store-'));
    dataPath = path.join(tempDir, 'runs.json');
    store = new WorkflowStore(dataPath);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('schedules retries when a step fails under the retry policy', async () => {
    const run = await store.createRun({
      workflowId: 'wf-retry',
      workflowName: 'Retry Workflow',
      retryPolicy: { strategy: 'immediate', maxAttempts: 3, intervalSeconds: 30 },
      steps: [
        {
          id: 'step-1',
          name: 'Gather context',
          maxAttempts: 3,
        },
      ],
    });

    await store.recordStepResult(run.id, 'step-1', { status: 'running' });

    await store.recordStepResult(run.id, 'step-1', {
      status: 'failed',
      error: { message: 'Temporary outage' },
      retry: { reason: 'Network instability', delaySeconds: 15 },
    });

    const updated = await store.getRun(run.id);
    expect(updated).toBeTruthy();
    expect(updated?.status).toBe('retrying');
    expect(updated?.retryHistory.length).toBe(1);
    expect(updated?.retryHistory[0]?.attempt).toBe(2);
    expect(updated?.retryHistory[0]?.stepId).toBe('step-1');
    expect(updated?.retryHistory[0]?.reason).toBe('Network instability');

    const step = updated?.steps.find((item) => item.id === 'step-1');
    expect(step?.retry.attempts).toBe(1);
    expect(step?.retry.nextRetryAt).toBeTruthy();
    expect(step?.retry.lastReason).toBe('Network instability');
    expect(step?.error?.message).toBe('Temporary outage');
  });

  it('persists logs so they can be read back from disk', async () => {
    const run = await store.createRun({
      workflowId: 'wf-logs',
      workflowName: 'Logging Workflow',
      steps: [
        {
          id: 'step-1',
          name: 'Collect data',
        },
      ],
    });

    await store.appendStepLog(run.id, 'step-1', { message: 'Initializing step', level: 'info' });
    await store.recordStepResult(run.id, 'step-1', { status: 'running' });
    await store.recordStepResult(run.id, 'step-1', { status: 'completed' });

    const runFromApi = await store.getRun(run.id);
    expect(runFromApi?.steps[0].logs.some((log) => log.message === 'Initializing step')).toBe(true);

    const raw = await readFile(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.runs[0].steps[0].logs[0].message).toBe('Initializing step');
  });
});
