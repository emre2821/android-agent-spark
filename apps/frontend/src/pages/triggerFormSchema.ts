import { z } from 'zod';
import type { WorkflowTrigger } from '@/types/workflow';
import { parseExpression } from '@/utils/cron';

const isValidTimeZone = (value: string | undefined) => {
  if (!value) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const triggerFormSchema = z
  .object({
    name: z.string().min(1, 'Trigger name is required'),
    type: z.enum(['cron', 'webhook', 'queue']),
    isActive: z.boolean().default(true),
    expression: z.string().optional(),
    timezone: z.string().optional(),
    queueName: z.string().optional(),
    batchSize: z.coerce.number().int().min(1).max(50).default(1),
    secret: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'cron') {
      if (!values.expression || values.expression.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cron expression is required', path: ['expression'] });
      } else if (!values.timezone || values.timezone.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Timezone is required', path: ['timezone'] });
      } else if (!isValidTimeZone(values.timezone)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Timezone not recognized', path: ['timezone'] });
      } else {
        try {
          parseExpression(values.expression, {
            tz: values.timezone,
            currentDate: new Date(),
          });
        } catch (error) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message, path: ['expression'] });
        }
      }
    }
    if (values.type === 'queue' && (!values.queueName || values.queueName.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Queue name is required', path: ['queueName'] });
    }
  });

export type TriggerFormValues = z.infer<typeof triggerFormSchema>;

export const getTriggerFormDefaults = (trigger?: WorkflowTrigger | null): TriggerFormValues => {
  if (!trigger) {
    return {
      name: '',
      type: 'cron',
      isActive: true,
      expression: '0 9 * * *',
      timezone: 'UTC',
      queueName: '',
      batchSize: 1,
      secret: '',
    };
  }

  switch (trigger.type) {
    case 'cron':
      return {
        name: trigger.name,
        type: 'cron',
        isActive: trigger.status === 'active',
        expression: trigger.config.expression,
        timezone: trigger.config.timezone,
        queueName: '',
        batchSize: 1,
        secret: '',
      };
    case 'queue':
      return {
        name: trigger.name,
        type: 'queue',
        isActive: trigger.status === 'active',
        expression: '0 9 * * *',
        timezone: 'UTC',
        queueName: trigger.config.queueName,
        batchSize: trigger.config.batchSize ?? 1,
        secret: '',
      };
    case 'webhook':
    default:
      return {
        name: trigger.name,
        type: 'webhook',
        isActive: trigger.status === 'active',
        expression: '0 9 * * *',
        timezone: 'UTC',
        queueName: '',
        batchSize: 1,
        secret: trigger.config.secret ?? '',
      };
  }
};
