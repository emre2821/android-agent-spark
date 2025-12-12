import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { parseExpression } from './utils/cron.js';
import { nowIso } from './utils/timestamp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runsDefaultPath = path.join(__dirname, 'data', 'workflowRuns.json');

const RUN_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export class WorkflowStore {
  constructor(filePath = runsDefaultPath) {
    this.filePath = filePath;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error) {
      await fs.writeFile(this.filePath, JSON.stringify({ runs: [] }, null, 2), 'utf-8');
    }
    this.initialized = true;
  }

  async readFile() {
    await this.init();
    const raw = await fs.readFile(this.filePath, 'utf-8');
    return raw ? JSON.parse(raw) : { runs: [] };
  }

  async writeFile(data) {
    await this.init();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  generateId() {
    return randomUUID();
  }

  _touchRun(run, overrides = {}) {
    const timestamp = nowIso();
    run.updatedAt = timestamp;
    if (RUN_TERMINAL_STATUSES.has(run.status) && !run.completedAt) {
      run.completedAt = timestamp;
    }
    Object.assign(run, overrides);
    return timestamp;
  }

  _pushRunHistory(run, status, note) {
    const timestamp = nowIso();
    run.history.push({ status, timestamp, note });
    run.status = status;
    run.updatedAt = timestamp;
    if (RUN_TERMINAL_STATUSES.has(status)) {
      run.completedAt = timestamp;
    }
    return timestamp;
  }

  _pushStepHistory(step, status, attempt, note) {
    const timestamp = nowIso();
    step.history.push({ status, timestamp, attempt, note });
    step.status = status;
    return timestamp;
  }

  _getRunStep(run, stepId) {
    const step = run.steps.find((item) => item.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }
    return step;
  }

  _calculateRetryWindow(delaySeconds) {
    const now = Date.now();
    const next = delaySeconds ? new Date(now + delaySeconds * 1000) : new Date(now);
    return next.toISOString();
  }

  async getAllRuns() {
    const data = await this.readFile();
    return ensureArray(data.runs).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  async getRun(id) {
    const data = await this.readFile();
    return ensureArray(data.runs).find((run) => run.id === id) ?? null;
  }

  async createRun(payload) {
    const data = await this.readFile();
    if (!payload?.steps || payload.steps.length === 0) {
      throw new Error('Workflow run requires at least one step');
    }

    const timestamp = nowIso();
    const retryPolicy = payload.retryPolicy ?? {
      strategy: 'none',
      maxAttempts: 1,
      intervalSeconds: 0,
    };

    const run = {
      id: this.generateId(),
      workflowId: payload.workflowId ?? 'workflow',
      workflowName: payload.workflowName ?? 'Untitled Workflow',
      trigger: payload.trigger ?? 'manual',
      status: 'running',
      startedAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
      currentAttempt: 1,
      retryPolicy,
      history: [],
      steps: payload.steps.map((step) => ({
        id: step.id ?? this.generateId(),
        name: step.name ?? 'Step',
        status: 'pending',
        attempt: 1,
        maxAttempts: step.maxAttempts ?? retryPolicy.maxAttempts ?? 1,
        startedAt: null,
        completedAt: null,
        logs: [],
        retry: {
          attempts: 0,
          maxAttempts: step.maxAttempts ?? retryPolicy.maxAttempts ?? 1,
          nextRetryAt: null,
          lastReason: null,
        },
        error: null,
        history: [],
      })),
      retryHistory: [],
      errors: [],
      metadata: payload.metadata ?? {},
    };

    this._pushRunHistory(run, 'running', 'Workflow run started');
    // Use for..of instead of forEach for better performance
    for (const step of run.steps) {
      this._pushStepHistory(step, 'pending', 1, 'Awaiting execution');
    }

    data.runs.push(run);
    await this.writeFile(data);
    return run;
  }

  async appendStepLog(runId, stepId, logEntry) {
    const data = await this.readFile();
    const run = ensureArray(data.runs).find((item) => item.id === runId);
    if (!run) {
      throw new Error('Run not found');
    }
    const step = this._getRunStep(run, stepId);
    const timestamp = nowIso();
    const entry = {
      id: this.generateId(),
      timestamp,
      level: logEntry.level ?? 'info',
      message: logEntry.message ?? '',
      context: logEntry.context ?? null,
    };
    step.logs.push(entry);
    run.updatedAt = timestamp;
    await this.writeFile(data);
    return entry;
  }

  async recordStepResult(runId, stepId, result) {
    const data = await this.readFile();
    const run = ensureArray(data.runs).find((item) => item.id === runId);
    if (!run) {
      throw new Error('Run not found');
    }
    const step = this._getRunStep(run, stepId);
    const now = nowIso();

    if (result.log) {
      step.logs.push({
        id: this.generateId(),
        timestamp: now,
        level: result.log.level ?? 'info',
        message: result.log.message,
        context: result.log.context ?? null,
      });
    }

    if (result.status === 'running') {
      const expectedAttempt = (step.retry?.attempts ?? 0) + 1;
      if (step.attempt < expectedAttempt) {
        step.attempt = expectedAttempt;
      }
      step.startedAt = now;
      step.retry.nextRetryAt = null;
      step.retry.lastReason = null;
      step.history.push({ status: 'running', timestamp: now, attempt: step.attempt, note: result.note ?? null });
      step.status = 'running';
      run.updatedAt = now;
      run.currentAttempt = Math.max(run.currentAttempt, step.attempt);
      await this.writeFile(data);
      return run;
    }

    if (result.status === 'completed') {
      step.completedAt = now;
      step.history.push({ status: 'completed', timestamp: now, attempt: step.attempt, note: result.note ?? null });
      step.status = 'completed';
      run.updatedAt = now;

      const allDone = run.steps.every((item) => item.status === 'completed');
      if (allDone) {
        this._pushRunHistory(run, 'completed', 'All steps completed');
      }
      await this.writeFile(data);
      return run;
    }

    if (result.status === 'failed') {
      step.completedAt = now;
      step.error = {
        message: result.error?.message ?? 'Step failed',
        code: result.error?.code ?? null,
        attempt: step.attempt,
        timestamp: now,
      };
      step.history.push({ status: 'failed', timestamp: now, attempt: step.attempt, note: result.error?.message ?? null });
      run.errors.push({
        stepId: step.id,
        message: step.error.message,
        attempt: step.attempt,
        timestamp: now,
      });
      run.updatedAt = now;

      if (result.retry) {
        const retryAttempts = step.retry.attempts + 1;
        const maxAttempts = result.retry.maxAttempts ?? step.retry.maxAttempts ?? step.maxAttempts;
        const nextAttempt = step.attempt + 1;
        const shouldRetry = nextAttempt <= maxAttempts;
        const nextRetryAt = shouldRetry
          ? this._calculateRetryWindow(result.retry.delaySeconds ?? run.retryPolicy.intervalSeconds ?? 0)
          : null;

        step.retry = {
          attempts: retryAttempts,
          maxAttempts,
          nextRetryAt,
          lastReason: result.retry.reason ?? result.error?.message ?? null,
        };
        run.retryHistory.push({
          attempt: nextAttempt,
          stepId: step.id,
          scheduledAt: nextRetryAt,
          reason: step.retry.lastReason,
        });

        if (shouldRetry) {
          run.history.push({
            status: 'retrying',
            timestamp: now,
            note: `Retry scheduled for step ${step.name}`,
          });
          run.status = 'retrying';
        } else {
          this._pushRunHistory(run, 'failed', step.error.message);
        }
      } else {
        this._pushRunHistory(run, 'failed', step.error.message);
      }

      await this.writeFile(data);
      return run;
    }

    throw new Error('Unsupported step status');
  }

  async retryRun(runId, reason) {
    const data = await this.readFile();
    const run = ensureArray(data.runs).find((item) => item.id === runId);
    if (!run) {
      throw new Error('Run not found');
    }
    const now = nowIso();
    run.currentAttempt += 1;
    run.history.push({ status: 'retrying', timestamp: now, note: reason ?? 'Manual retry requested' });
    run.retryHistory.push({
      attempt: run.currentAttempt,
      stepId: null,
      scheduledAt: now,
      reason: reason ?? 'Manual retry requested',
    });
    run.status = 'retrying';
    run.updatedAt = now;

    run.steps = run.steps.map((step) => {
      if (step.status === 'completed') {
        return step;
      }
      const nextAttempt = step.attempt + 1;
      const note = reason ? `Manual retry: ${reason}` : 'Manual retry requested';

      step.history.push({ status: 'pending', timestamp: now, attempt: nextAttempt, note });
      step.logs.push({
        id: this.generateId(),
        timestamp: now,
        level: 'info',
        message: note,
        context: null,
      });

      step.status = 'pending';
      step.attempt = nextAttempt;
      step.startedAt = null;
      step.completedAt = null;
      step.error = null;
      step.retry = {
        attempts: nextAttempt - 1,
        maxAttempts: step.retry?.maxAttempts ?? step.maxAttempts,
        nextRetryAt: null,
        lastReason: reason ?? step.retry?.lastReason ?? null,
      };

      run.currentAttempt = Math.max(run.currentAttempt, nextAttempt);
      return step;
    });

    await this.writeFile(data);
    return run;
  }

  async cancelRun(runId, reason) {
    const data = await this.readFile();
    const run = ensureArray(data.runs).find((item) => item.id === runId);
    if (!run) {
      throw new Error('Run not found');
    }
    const note = reason ?? 'Cancelled by user';
    this._pushRunHistory(run, 'cancelled', note);
    run.steps = run.steps.map((step) => {
      if (step.status === 'completed') {
        return step;
      }
      step.history.push({ status: 'cancelled', timestamp: run.updatedAt, attempt: step.attempt, note });
      step.status = 'cancelled';
      step.completedAt = run.updatedAt;
      return step;
    });

    await this.writeFile(data);
    return run;
  }
}

export const workflowStore = new WorkflowStore();

const dataDir = path.join(__dirname, 'data');
const getWorkflowFileName = () => (process.env.NODE_ENV === 'test' ? 'workflows.test.json' : 'workflows.json');
const getDataFile = () => path.join(dataDir, getWorkflowFileName());

const defaultData = {
  workflows: [],
};

function buildCronMetadata(config, count = 5) {
  try {
    const iterator = parseExpression(config.expression, {
      tz: config.timezone || 'UTC',
      currentDate: new Date(),
    });
    const occurrences = [];
    for (let index = 0; index < count; index += 1) {
      occurrences.push(iterator.next().toDate().toISOString());
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
    await fs.mkdir(dataDir, { recursive: true });
  }
  const dataFile = getDataFile();
  if (!existsSync(dataFile)) {
    await fs.writeFile(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

export async function resetWorkflowStore() {
  await withStoreLock(async () => {
    const dataFile = getDataFile();
    if (existsSync(dataFile)) {
      await fs.unlink(dataFile);
    }
  });
  workflowStore.initialized = false;
}

async function readStore() {
  await ensureStore();
  const dataFile = getDataFile();
  try {
    const raw = await fs.readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.workflows)) {
      throw new Error('Invalid workflow store payload');
    }
    return parsed;
  } catch {
    // Use structuredClone if available (Node 17+), otherwise create new default
    // Note: defaultData is simple structure (workflows array), so both methods work
    const fallback = typeof structuredClone !== 'undefined' 
      ? structuredClone(defaultData) 
      : { workflows: [] }; // Recreate simple default rather than shallow clone
    await fs.writeFile(dataFile, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

async function writeStore(data) {
  await ensureStore();
  const dataFile = getDataFile();
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
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

function normalizeWorkflow(input) {
  return {
    ...input,
    triggers: (input.triggers ?? []).map((trigger) => normalizeTrigger(trigger, input.id)),
    runs: [...(input.runs ?? [])],
  };
}

function createWorkflowRecord(payload) {
  const now = nowIso();
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
    triggers: updates.triggers
      ? updates.triggers.map((trigger) => normalizeTrigger(trigger, current.id))
      : current.triggers,
    runs: updates.runs ?? current.runs,
    updatedAt: nowIso(),
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
  const now = nowIso();
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
    data.workflows[index].updatedAt = nowIso();
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
      updatedAt: nowIso(),
    };
    const normalized = normalizeTrigger(merged, workflowId);
    data.workflows[workflowIndex].triggers[triggerIndex] = normalized;
    data.workflows[workflowIndex].updatedAt = nowIso();
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
    data.workflows[workflowIndex].updatedAt = nowIso();
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
    const now = nowIso();
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
    data.workflows[workflowIndex].updatedAt = nowIso();
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
    data.workflows[workflowIndex].updatedAt = nowIso();
    await writeStore(data);
    return { ...updated };
  });
}

export function computeCronPreview(expression, timezone = 'UTC', count = 5) {
  return buildCronMetadata({ expression, timezone }, count).preview ?? [];
}
