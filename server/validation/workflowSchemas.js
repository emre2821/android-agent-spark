import { z } from 'zod';
import { parseExpression } from '../utils/cron.js';

const workflowStatusSchema = z.enum(['draft', 'active', 'paused', 'archived']);

function isValidTimeZone(value) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validateCron(expression, timezone) {
  try {
    parseExpression(expression, { tz: timezone || 'UTC', currentDate: new Date() });
    return true;
  } catch {
    return false;
  }
}

const cronConfigSchema = z
  .object({
    expression: z.string().min(1, 'Cron expression is required'),
    timezone: z
      .string()
      .min(1, 'Timezone is required')
      .default('UTC')
      .refine(isValidTimeZone, 'Invalid timezone'),
    payload: z.record(z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (!validateCron(value.expression, value.timezone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid cron expression' });
    }
  });

const webhookConfigSchema = z.object({
  secret: z.string().optional(),
  path: z.string().optional(),
});

const queueConfigSchema = z.object({
  queueName: z.string().min(1, 'Queue name is required'),
  batchSize: z.number().int().min(1).max(50).optional(),
});

const baseTriggerSchema = z.object({
  name: z.string().min(1, 'Trigger name is required'),
  status: z.enum(['active', 'paused']).default('active'),
});

export const triggerInputSchema = z.discriminatedUnion('type', [
  baseTriggerSchema.extend({
    type: z.literal('cron'),
    config: cronConfigSchema,
  }),
  baseTriggerSchema.extend({
    type: z.literal('webhook'),
    config: webhookConfigSchema.default({}),
  }),
  baseTriggerSchema.extend({
    type: z.literal('queue'),
    config: queueConfigSchema,
  }),
]);

export const workflowInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  status: workflowStatusSchema.default('draft'),
  agentId: z.string().optional().nullable(),
  steps: z.array(z.any()).optional(),
});

export const workflowUpdateSchema = workflowInputSchema.partial().extend({
  status: workflowStatusSchema.optional(),
});

export const triggerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'paused']).optional(),
  type: z.enum(['cron', 'webhook', 'queue']).optional(),
  config: z.record(z.unknown()).optional(),
});

export const queuePublishSchema = z.object({
  payload: z.any().optional(),
});
