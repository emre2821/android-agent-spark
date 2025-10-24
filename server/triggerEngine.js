import EventEmitter from 'events';
import { CronExpressionParser } from 'cron-parser';
import {
  createWorkflowRunRecord,
  getWorkflow,
  listWorkflows,
  setTriggerMetadata,
  updateWorkflow,
  updateWorkflowTrigger,
  updateWorkflowRunRecord,
} from './workflowStore.js';
import { queueService } from './queueService.js';

class TriggerEngine extends EventEmitter {
  constructor() {
    super();
    this.cronTimers = new Map();
    this.queueSubscriptions = new Map();
    this.triggerIndex = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    const workflows = await listWorkflows();
    await Promise.all(workflows.map((workflow) => this.syncWorkflow(workflow)));
    this.initialized = true;
  }

  async syncWorkflow(workflow) {
    await this.unregisterWorkflow(workflow.id);
    if (workflow.status !== 'active') {
      return;
    }
    for (const trigger of workflow.triggers ?? []) {
      await this.registerTrigger(workflow, trigger);
    }
  }

  async unregisterWorkflow(workflowId) {
    const targets = Array.from(this.triggerIndex.entries()).filter(([, info]) => info.workflowId === workflowId);
    await Promise.all(targets.map(([triggerId]) => this.unregisterTrigger(triggerId)));
  }

  async registerTrigger(workflow, trigger) {
    if (trigger.status === 'paused') {
      return;
    }
    this.triggerIndex.set(trigger.id, { workflowId: workflow.id, trigger });
    if (trigger.type === 'cron') {
      this.scheduleCronTrigger(workflow, trigger);
    } else if (trigger.type === 'queue') {
      this.subscribeQueueTrigger(workflow, trigger);
    }
  }

  async unregisterTrigger(triggerId) {
    const timer = this.cronTimers.get(triggerId);
    if (timer) {
      clearTimeout(timer.timeout);
      this.cronTimers.delete(triggerId);
    }
    const unsubscribe = this.queueSubscriptions.get(triggerId);
    if (unsubscribe) {
      unsubscribe();
      this.queueSubscriptions.delete(triggerId);
    }
    this.triggerIndex.delete(triggerId);
  }

  scheduleCronTrigger(workflow, trigger) {
    const planNext = () => {
      let nextDate;
      try {
        const expression = CronExpressionParser.parse(trigger.config.expression, {
          tz: trigger.config.timezone || 'UTC',
          currentDate: new Date(),
        });
        nextDate = expression.next().toDate();
        const preview = [];
        preview.push(nextDate.toISOString());
        for (let index = 0; index < 4; index += 1) {
          preview.push(expression.next().toDate().toISOString());
        }
        setTriggerMetadata(workflow.id, trigger.id, {
          nextRunAt: preview[0] ?? null,
          preview,
        }).catch((error) => {
          console.error('Failed to update trigger metadata', error);
        });
      } catch (error) {
        console.error('Failed to schedule cron trigger', error);
        return;
      }
      const delay = Math.max(nextDate.getTime() - Date.now(), 0);
      const timeout = setTimeout(async () => {
        await this.executeTrigger(workflow.id, trigger, { reason: 'cron' });
        planNext();
      }, delay);
      this.cronTimers.set(trigger.id, { timeout });
    };

    planNext();
  }

  subscribeQueueTrigger(workflow, trigger) {
    const queueName = trigger.config.queueName || 'default';
    const unsubscribe = queueService.subscribe(queueName, async (message) => {
      await this.executeTrigger(workflow.id, trigger, { reason: 'queue', message });
    });
    this.queueSubscriptions.set(trigger.id, unsubscribe);
  }

  async refreshTrigger(workflowId, trigger) {
    await this.unregisterTrigger(trigger.id);
    const workflow = await getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'active') {
      return;
    }
    await this.registerTrigger(workflow, trigger);
  }

  async executeTrigger(workflowId, trigger, context) {
    const workflow = await getWorkflow(workflowId);
    if (!workflow || workflow.status !== 'active') {
      return;
    }
    const run = await createWorkflowRunRecord(workflowId, {
      triggerId: trigger.id,
      status: 'pending',
      context,
    });
    this.emit('workflow:started', { workflowId, trigger, run });
    try {
      // Simulate work by iterating steps and introducing slight delay.
      await this.simulateExecution(workflowId, trigger);
      await updateWorkflowRunRecord(workflowId, run.id, {
        status: 'success',
        finishedAt: new Date().toISOString(),
        result: {
          message: `${workflow.name} executed via ${trigger.type} trigger`,
        },
      });
      await updateWorkflow(workflowId, {
        lastRunAt: new Date().toISOString(),
        lastRunStatus: 'success',
      });
      this.emit('workflow:completed', { workflowId, trigger, runId: run.id });
    } catch (error) {
      await updateWorkflowRunRecord(workflowId, run.id, {
        status: 'error',
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await updateWorkflow(workflowId, {
        lastRunAt: new Date().toISOString(),
        lastRunStatus: 'error',
      });
      this.emit('workflow:error', { workflowId, trigger, runId: run.id, error });
    }
  }

  async simulateExecution(workflowId, trigger) {
    const workflow = await getWorkflow(workflowId);
    const steps = workflow?.steps ?? [];
    for (const step of steps) {
      this.emit('step:started', { workflowId, triggerId: trigger.id, stepId: step.id });
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.emit('step:completed', { workflowId, triggerId: trigger.id, stepId: step.id });
    }
  }

  async handleWebhook(triggerId, payload) {
    const entry = this.triggerIndex.get(triggerId);
    if (!entry) {
      throw new Error('Trigger not registered');
    }
    const workflow = await getWorkflow(entry.workflowId);
    if (!workflow || workflow.status !== 'active') {
      throw new Error('Workflow inactive');
    }
    await this.executeTrigger(entry.workflowId, entry.trigger, {
      reason: 'webhook',
      payload,
    });
  }

  async publishToQueue(queueName, payload) {
    queueService.publish(queueName, payload);
  }
}

export const triggerEngine = new TriggerEngine();
