import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, server as httpServer } from '../index.js';
import { resetWorkflowStore } from '../workflowStore.js';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function expectJson(response: Response, expectedStatus: number) {
  const text = await response.text();
  expect(response.status).toBe(expectedStatus);
  try {
    return JSON.parse(text || '{}');
  } catch (error) {
    throw new Error(`Failed to parse JSON response (status ${response.status}): ${text}`);
  }
}

let baseUrl: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await resetWorkflowStore();
  const running = await startServer(0);
  const address = running.address();
  if (typeof address === 'object' && address) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  } else {
    throw new Error('Failed to determine server port');
  }
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
});

describe('trigger engine integration', () => {
  it('executes cron triggers for active workflows', async () => {
    const response = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cron Flow',
        description: 'Runs every second',
        status: 'active',
      }),
    });
    const { data: workflow } = (await expectJson(response, 201)) as { data: any };

    const triggerResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cron',
        name: 'Fast Tick',
        status: 'active',
        config: { expression: '*/1 * * * * *', timezone: 'UTC' },
      }),
    });
    await expectJson(triggerResponse, 201);

    await wait(2100);

    const runsResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/runs`);
    const { data: runs } = (await expectJson(runsResponse, 200)) as { data: any[] };
    expect(runs.length).toBeGreaterThan(0);
  });

  it('processes webhook invocations', async () => {
    const response = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Webhook Flow',
        description: 'Triggered via webhook',
        status: 'active',
      }),
    });
    const { data: workflow } = (await expectJson(response, 201)) as { data: any };

    const triggerResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'webhook',
        name: 'Webhook Receiver',
        status: 'active',
      }),
    });
    const { data: trigger } = (await expectJson(triggerResponse, 201)) as { data: any };

    await fetch(`${baseUrl}/triggers/webhook/${trigger.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping' }),
    });

    await wait(200);

    const runsResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/runs`);
    const { data: runs } = (await expectJson(runsResponse, 200)) as { data: any[] };
    expect(runs.some((run) => run.triggerId === trigger.id)).toBe(true);
  });

  it('consumes queue messages', async () => {
    const response = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Queue Flow',
        description: 'Processes queue events',
        status: 'active',
      }),
    });
    const { data: workflow } = (await expectJson(response, 201)) as { data: any };

    const triggerResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'queue',
        name: 'Queue Listener',
        status: 'active',
        config: { queueName: 'ingest' },
      }),
    });
    await expectJson(triggerResponse, 201);

    const publishResponse = await fetch(`${baseUrl}/api/triggers/queue/ingest/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: { record: 1 } }),
    });
    await expectJson(publishResponse, 202);

    await wait(200);

    const runsResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/runs`);
    const { data: runs } = (await expectJson(runsResponse, 200)) as { data: any[] };
    expect(runs.length).toBeGreaterThan(0);
  });

  it('stops cron execution when workflow is paused', async () => {
    const response = await fetch(`${baseUrl}/api/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pause Flow',
        description: 'Can be paused',
        status: 'active',
      }),
    });
    const { data: workflow } = (await expectJson(response, 201)) as { data: any };

    const triggerResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cron',
        name: 'Short Cron',
        status: 'active',
        config: { expression: '*/1 * * * * *', timezone: 'UTC' },
      }),
    });
    await expectJson(triggerResponse, 201);

    await wait(1300);
    const runsBeforeResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/runs`);
    const { data: runsBefore } = (await expectJson(runsBeforeResponse, 200)) as { data: any[] };

    const pauseResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' }),
    });
    const pausedPayload = (await expectJson(pauseResponse, 200)) as { data: any };
    expect(pausedPayload.data?.status).toBe('paused');

    await wait(1500);

    const runsAfterResponse = await fetch(`${baseUrl}/api/workflows/${workflow.id}/runs`);
    const { data: runsAfter } = (await expectJson(runsAfterResponse, 200)) as { data: any[] };

    expect(runsAfter.length).toBe(runsBefore.length);
  });
});
