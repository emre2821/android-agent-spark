import { CronExpressionParser } from 'cron-parser';
import type { CronExpressionOptions } from 'cron-parser';

export function parseExpression(expression: string, options: CronExpressionOptions = {}) {
  return CronExpressionParser.parse(expression, options);
}
