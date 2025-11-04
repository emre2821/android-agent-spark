import { z } from 'zod';
import cronParser from 'cron-parser';

const cronModule = cronParser as unknown as {
  parseExpression?: typeof cronParser.parse;
  parse?: typeof cronParser.parse;
  CronExpressionParser?: { parse: typeof cronParser.parse };
  default?: { parse: typeof cronParser.parse };
};

const resolvedParse =
  (typeof cronParser === 'function' && typeof cronParser.parse === 'function'
    ? cronParser.parse.bind(cronParser)
    : cronModule.parseExpression ??
      cronModule.CronExpressionParser?.parse.bind(cronModule.CronExpressionParser) ??
      cronModule.default?.parse.bind(cronModule.default) ??
      cronModule.parse?.bind(cronModule));

if (!resolvedParse) {
  throw new Error('cron-parser parseExpression is not available');
}

const parseExpression = resolvedParse;

export const isValidTimeZone = (value: string | undefined) => {
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
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error instanceof Error ? error.message : 'Invalid cron expression',
            path: ['expression'],
          });
        }
      }
    }
    if (values.type === 'queue' && (!values.queueName || values.queueName.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Queue name is required', path: ['queueName'] });
    }
  });

export type TriggerFormValues = z.infer<typeof triggerFormSchema>;
