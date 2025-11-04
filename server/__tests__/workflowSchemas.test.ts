import { describe, expect, it } from 'vitest';
import { triggerInputSchema } from '../validation/workflowSchemas.js';

describe('triggerInputSchema cron validation', () => {
  it('accepts a valid cron expression with timezone', () => {
    const result = triggerInputSchema.safeParse({
      type: 'cron',
      name: 'Morning run',
      status: 'active',
      config: {
        expression: '0 9 * * *',
        timezone: 'UTC',
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid cron expression', () => {
    const result = triggerInputSchema.safeParse({
      type: 'cron',
      name: 'Broken schedule',
      status: 'active',
      config: {
        expression: 'not-a-cron',
        timezone: 'UTC',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => issue.message);
      expect(issues.some((message) => message.toLowerCase().includes('cron'))).toBe(true);
    }
  });
});
