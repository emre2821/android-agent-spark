import { describe, expect, it } from 'vitest';
import { triggerFormSchema, type TriggerFormValues } from '../workflows/triggerFormSchema';

describe('trigger form schema', () => {
  it('accepts valid cron trigger values', () => {
    const values: TriggerFormValues = {
      name: 'Morning digest',
      type: 'cron',
      isActive: true,
      expression: '*/5 * * * *',
      timezone: 'UTC',
      queueName: '',
      batchSize: 1,
      secret: '',
    };

    const result = triggerFormSchema.safeParse(values);
    expect(result.success).toBe(true);
  });

  it('captures errors for invalid cron expressions', () => {
    const values: TriggerFormValues = {
      name: 'Broken cron',
      type: 'cron',
      isActive: true,
      expression: 'invalid cron',
      timezone: 'UTC',
      queueName: '',
      batchSize: 1,
      secret: '',
    };

    const result = triggerFormSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = result.error.format();
      expect(formatted.expression?._errors?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
