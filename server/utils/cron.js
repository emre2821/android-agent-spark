import { CronExpressionParser } from 'cron-parser';

export function parseExpression(expression, options = {}) {
  return CronExpressionParser.parse(expression, options);
}
