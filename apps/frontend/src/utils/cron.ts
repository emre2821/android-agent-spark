import { parseExpression as cronParseExpression } from 'cron-parser';
import type { CronExpressionOptions } from 'cron-parser';

export function parseExpression(expression: string, options: CronExpressionOptions = {}) {
  return cronParseExpression(expression, options);
}
