export type WorkflowTriggerType = 'cron' | 'webhook' | 'queue';
export type WorkflowTriggerStatus = 'active' | 'paused';

export interface CronTriggerConfig {
  expression: string;
  timezone: string;
  payload?: Record<string, unknown> | null;
}

export interface WebhookTriggerConfig {
  secret: string | null;
  path: string | null;
}

export interface QueueTriggerConfig {
  queueName: string;
  batchSize: number;
}

export type WorkflowTriggerConfig = CronTriggerConfig | WebhookTriggerConfig | QueueTriggerConfig;

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  name: string;
  type: WorkflowTriggerType;
  status: WorkflowTriggerStatus;
  config: WorkflowTriggerConfig;
  createdAt: string;
  updatedAt: string;
}
