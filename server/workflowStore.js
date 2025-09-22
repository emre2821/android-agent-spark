import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_PATH = path.join(__dirname, 'data', 'workflowRuns.json');

const RUN_TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export class WorkflowStore {
  constructor(filePath = DEFAULT_DATA_PATH) {
    this.filePath = filePath;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error) {
      await fs.writeFile(
        this.filePath,
        JSON.stringify({ runs: [] }, null, 2),
        'utf-8'
      );
    }
    this.initialized = true;
  }

  async readFile() {
    await this.init();
    const raw = await fs.readFile(this.filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async writeFile(data) {
    await this.init();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  generateId() {
    return crypto.randomUUID();
  }

  _touchRun(run, overrides = {}) {
    const timestamp = new Date().toISOString();
    run.updatedAt = timestamp;
    if (RUN_TERMINAL_STATUSES.has(run.status) && !run.completedAt) {
      run.completedAt = timestamp;
    }
    Object.assign(run, overrides);
    return timestamp;
  }

  _pushRunHistory(run, status, note) {
    const timestamp = new Date().toISOString();
    run.history.push({ status, timestamp, note });
    run.status = status;
    run.updatedAt = timestamp;
    if (RUN_TERMINAL_STATUSES.has(status)) {
      run.completedAt = timestamp;
    }
    return timestamp;
  }

  _pushStepHistory(step, status, attempt, note) {
    const timestamp = new Date().toISOString();
    step.history.push({ status, timestamp, attempt, note });
    step.status = status;
    return timestamp;
  }

  _getRunAndStep(run, stepId) {
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
    return ensureArray(data.runs).sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
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

    const timestamp = new Date().toISOString();
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
    run.steps.forEach((step) => {
      this._pushStepHistory(step, 'pending', 1, 'Awaiting execution');
    });

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
    const step = this._getRunAndStep(run, stepId);
    const timestamp = new Date().toISOString();
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
    const step = this._getRunAndStep(run, stepId);
    const now = new Date().toISOString();

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
    const now = new Date().toISOString();
    run.currentAttempt += 1;
    run.history.push({ status: 'retrying', timestamp: now, note: reason ?? 'Manual retry requested' });
    run.retryHistory.push({ attempt: run.currentAttempt, stepId: null, scheduledAt: now, reason: reason ?? 'Manual retry requested' });
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
