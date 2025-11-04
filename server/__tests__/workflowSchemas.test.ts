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
describe('workflow trigger cron validation', () => {
  it('accepts a valid cron expression and timezone', () => {
    const result = triggerInputSchema.safeParse({
      type: 'cron',
      name: 'Valid Cron',
      status: 'active',
      config: {
        expression: '*/5 * * * * *',
        timezone: 'UTC',
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid cron expression', () => {
    const result = triggerInputSchema.safeParse({
      type: 'cron',
      name: 'Broken schedule',
      name: 'Invalid Cron',
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
      expect(result.error.issues.some((issue) => issue.message.includes('Invalid cron expression'))).toBe(true);
    }
  });
});
