import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { CronExpressionParser } from 'cron-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const getWorkflowFileName = () => (process.env.NODE_ENV === 'test' ? 'workflows.test.json' : 'workflows.json');
const getDataFile = () => path.join(dataDir, getWorkflowFileName());

const defaultData = {
  workflows: [
    {
      id: 'wf-daily-digest',
      name: 'Daily Digest',
      description: 'Collects highlights from the past day and sends them to the team.',
      status: 'active',
      agentId: '1',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      steps: [],
      triggers: [
        {
          id: 'tr-daily-cron',
          workflowId: 'wf-daily-digest',
          type: 'cron',
          name: 'Morning Summary',
          status: 'active',
          config: {
            expression: '0 9 * * *',
            timezone: 'UTC',
          },
          metadata: buildCronMetadata({
            expression: '0 9 * * *',
            timezone: 'UTC',
          }),
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      runs: [],
    },
  ],
};

function buildCronMetadata(config, count = 5) {
  try {
    const expression = CronExpressionParser.parse(config.expression, {
      tz: config.timezone || 'UTC',
      currentDate: new Date(),
    });
    const occurrences = [];
    for (let index = 0; index < count; index += 1) {
      occurrences.push(expression.next().toDate().toISOString());
    }
    return {
      nextRunAt: occurrences[0] ?? null,
      preview: occurrences,
    };
  } catch {
    return {
      nextRunAt: null,
      preview: [],
    };
  }
}

let storeLock = Promise.resolve();

function withStoreLock(task) {
  const run = storeLock.then(() => task());
  storeLock = run.catch(() => {});
  return run;
}

async function ensureStore() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  const dataFile = getDataFile();
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

export async function resetWorkflowStore() {
  return withStoreLock(async () => {
    const dataFile = getDataFile();
    if (existsSync(dataFile)) {
      await unlink(dataFile);
    }
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
    await writeFile(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
  });
}

async function readStore() {
  await ensureStore();
  const dataFile = getDataFile();
  try {
    const raw = await readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.workflows)) {
      throw new Error('Invalid workflow store payload');
    }
    return parsed;
  } catch {
    const fallback = JSON.parse(JSON.stringify(defaultData));
    await writeFile(dataFile, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

async function writeStore(data) {
  await ensureStore();
  const dataFile = getDataFile();
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

function normalizeWorkflow(input) {
  return {
    ...input,
    triggers: (input.triggers ?? []).map((trigger) => normalizeTrigger(trigger, input.id)),
    runs: [...(input.runs ?? [])],
  };
}

function normalizeTrigger(trigger, workflowId) {
  if (!trigger) return trigger;
  const base = {
    ...trigger,
    workflowId,
    metadata: trigger.metadata ?? null,
  };
  if (trigger.type === 'cron') {
    return {
      ...base,
      config: {
        expression: trigger.config?.expression ?? '0 9 * * *',
        timezone: trigger.config?.timezone ?? 'UTC',
        payload: trigger.config?.payload ?? null,
      },
      metadata: trigger.metadata ?? buildCronMetadata({
        expression: trigger.config?.expression ?? '0 9 * * *',
        timezone: trigger.config?.timezone ?? 'UTC',
      }),
    };
  }
  if (trigger.type === 'queue') {
    return {
      ...base,
      config: {
        queueName: trigger.config?.queueName ?? 'default',
        batchSize: trigger.config?.batchSize ?? 1,
      },
    };
  }
  if (trigger.type === 'webhook') {
    return {
      ...base,
      config: {
        secret: trigger.config?.secret ?? null,
        path: trigger.config?.path ?? null,
      },
    };
  }
  return base;
}

function createWorkflowRecord(payload) {
  const now = new Date().toISOString();
  const workflowId = payload.id ?? randomUUID();
  return {
    id: workflowId,
    name: payload.name,
    description: payload.description ?? '',
    status: payload.status ?? 'draft',
    agentId: payload.agentId ?? null,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
    steps: payload.steps ?? [],
    triggers: [],
    runs: [],
  };
}

function mergeWorkflow(current, updates) {
  return {
    ...current,
    ...updates,
    steps: updates.steps ?? current.steps,
    triggers: updates.triggers ? updates.triggers.map((trigger) => normalizeTrigger(trigger, current.id)) : current.triggers,
    runs: updates.runs ?? current.runs,
    updatedAt: new Date().toISOString(),
  };
}

export async function listWorkflows() {
  const data = await readStore();
  return data.workflows.map((workflow) => normalizeWorkflow(workflow));
}

export async function getWorkflow(workflowId) {
  const data = await readStore();
  const workflow = data.workflows.find((item) => item.id === workflowId);
  return workflow ? normalizeWorkflow(workflow) : null;
}

export async function createWorkflow(payload) {
  return withStoreLock(async () => {
    const data = await readStore();
    const workflow = createWorkflowRecord(payload);
    data.workflows.push(workflow);
    await writeStore(data);
    return normalizeWorkflow(workflow);
  });
}

export async function upsertWorkflow(workflowId, payload) {
  return withStoreLock(async () => {
    const data = await readStore();
    const index = data.workflows.findIndex((item) => item.id === workflowId);
    if (index === -1) {
      const workflow = createWorkflowRecord({ ...payload, id: workflowId });
      data.workflows.push(workflow);
      await writeStore(data);
      return normalizeWorkflow(workflow);
    }
    const updated = mergeWorkflow(data.workflows[index], { ...payload, id: workflowId });
    data.workflows[index] = updated;
    await writeStore(data);
    return normalizeWorkflow(updated);
  });
}

export async function updateWorkflow(workflowId, updates) {
  return withStoreLock(async () => {
    const data = await readStore();
    const index = data.workflows.findIndex((item) => item.id === workflowId);
    if (index === -1) return null;
    const updated = mergeWorkflow(data.workflows[index], updates);
    data.workflows[index] = updated;
    await writeStore(data);
    return normalizeWorkflow(updated);
  });
}

export async function deleteWorkflow(workflowId) {
  return withStoreLock(async () => {
    const data = await readStore();
    const initialLength = data.workflows.length;
    data.workflows = data.workflows.filter((workflow) => workflow.id !== workflowId);
    if (data.workflows.length === initialLength) return false;
    await writeStore(data);
    return true;
  });
}

export async function listWorkflowTriggers(workflowId) {
  const workflow = await getWorkflow(workflowId);
  return workflow ? workflow.triggers ?? [] : [];
}

function buildTriggerRecord(workflowId, payload) {
  const now = new Date().toISOString();
  const base = {
    id: payload.id ?? randomUUID(),
    workflowId,
    name: payload.name,
    type: payload.type,
    status: payload.status ?? 'active',
    config: payload.config ?? {},
    metadata: payload.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  };
  return normalizeTrigger(base, workflowId);
}

export async function createWorkflowTrigger(workflowId, payload) {
  return withStoreLock(async () => {
    const data = await readStore();
    const index = data.workflows.findIndex((item) => item.id === workflowId);
    if (index === -1) {
      throw new Error('Workflow not found');
    }
    const trigger = buildTriggerRecord(workflowId, payload);
    data.workflows[index].triggers = data.workflows[index].triggers ?? [];
    data.workflows[index].triggers.push(trigger);
    data.workflows[index].updatedAt = new Date().toISOString();
    await writeStore(data);
    return normalizeTrigger(trigger, workflowId);
  });
}

export async function updateWorkflowTrigger(workflowId, triggerId, updates) {
  return withStoreLock(async () => {
    const data = await readStore();
    const workflowIndex = data.workflows.findIndex((item) => item.id === workflowId);
    if (workflowIndex === -1) {
      throw new Error('Workflow not found');
    }
    const triggers = data.workflows[workflowIndex].triggers ?? [];
    const triggerIndex = triggers.findIndex((item) => item.id === triggerId);
    if (triggerIndex === -1) {
      throw new Error('Trigger not found');
    }
    const current = triggers[triggerIndex];
    const merged = {
      ...current,
      ...updates,
      config: {
        ...current.config,
        ...(updates.config ?? {}),
      },
      metadata: updates.metadata ?? current.metadata,
      updatedAt: new Date().toISOString(),
    };
    const normalized = normalizeTrigger(merged, workflowId);
    data.workflows[workflowIndex].triggers[triggerIndex] = normalized;
    data.workflows[workflowIndex].updatedAt = new Date().toISOString();
    await writeStore(data);
    return normalizeTrigger(normalized, workflowId);
  });
}

export async function deleteWorkflowTrigger(workflowId, triggerId) {
  return withStoreLock(async () => {
    const data = await readStore();
    const workflowIndex = data.workflows.findIndex((item) => item.id === workflowId);
    if (workflowIndex === -1) {
      throw new Error('Workflow not found');
    }
    const triggers = data.workflows[workflowIndex].triggers ?? [];
    const initialLength = triggers.length;
    data.workflows[workflowIndex].triggers = triggers.filter((item) => item.id !== triggerId);
    if (data.workflows[workflowIndex].triggers.length === initialLength) {
      throw new Error('Trigger not found');
    }
    data.workflows[workflowIndex].updatedAt = new Date().toISOString();
    await writeStore(data);
    return true;
  });
}

export async function setTriggerMetadata(workflowId, triggerId, metadata) {
  return updateWorkflowTrigger(workflowId, triggerId, { metadata });
}

export async function listWorkflowRuns(workflowId) {
  const workflow = await getWorkflow(workflowId);
  return workflow ? workflow.runs ?? [] : [];
}

export async function createWorkflowRunRecord(workflowId, payload) {
  return withStoreLock(async () => {
    const data = await readStore();
    const workflowIndex = data.workflows.findIndex((item) => item.id === workflowId);
    if (workflowIndex === -1) {
      throw new Error('Workflow not found');
    }
    const now = new Date().toISOString();
    const run = {
      id: payload.id ?? randomUUID(),
      workflowId,
      triggerId: payload.triggerId,
      status: payload.status ?? 'pending',
      context: payload.context ?? null,
      result: payload.result ?? null,
      error: payload.error ?? null,
      startedAt: payload.startedAt ?? now,
      finishedAt: payload.finishedAt ?? null,
    };
    data.workflows[workflowIndex].runs = data.workflows[workflowIndex].runs ?? [];
    data.workflows[workflowIndex].runs.push(run);
    data.workflows[workflowIndex].updatedAt = new Date().toISOString();
    await writeStore(data);
    return { ...run };
  });
}

export async function updateWorkflowRunRecord(workflowId, runId, updates) {
  return withStoreLock(async () => {
    const data = await readStore();
    const workflowIndex = data.workflows.findIndex((item) => item.id === workflowId);
    if (workflowIndex === -1) {
      throw new Error('Workflow not found');
    }
    const runs = data.workflows[workflowIndex].runs ?? [];
    const runIndex = runs.findIndex((item) => item.id === runId);
    if (runIndex === -1) {
      throw new Error('Run not found');
    }
    const current = runs[runIndex];
    const updated = {
      ...current,
      ...updates,
      finishedAt: updates.finishedAt ?? current.finishedAt,
      result: updates.result ?? current.result,
      error: updates.error ?? current.error,
    };
    data.workflows[workflowIndex].runs[runIndex] = updated;
    data.workflows[workflowIndex].updatedAt = new Date().toISOString();
    await writeStore(data);
    return { ...updated };
  });
}

export function computeCronPreview(expression, timezone = 'UTC', count = 5) {
  return buildCronMetadata({ expression, timezone }, count).preview ?? [];
}
