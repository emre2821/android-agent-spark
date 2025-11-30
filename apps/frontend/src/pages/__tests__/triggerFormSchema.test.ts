import { describe, expect, it } from 'vitest';
import { triggerFormSchema } from '../triggerFormSchema';

describe('trigger form cron validation', () => {
  it('accepts a valid cron expression and timezone', () => {
    const result = triggerFormSchema.safeParse({
      name: 'Valid trigger',
      type: 'cron',
      isActive: true,
      expression: '*/10 * * * * *',
      timezone: 'UTC',
      queueName: '',
      batchSize: 1,
      secret: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid cron expression', () => {
    const result = triggerFormSchema.safeParse({
      name: 'Broken trigger',
      type: 'cron',
      isActive: true,
      expression: 'bad-cron',
      timezone: 'UTC',
      queueName: '',
      batchSize: 1,
      secret: '',
    });

    expect(result.success).toBe(false);
  });
});
