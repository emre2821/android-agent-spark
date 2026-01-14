import { parseExpression as cronParseExpression } from 'cron-parser';

export function parseExpression(expression, options = {}) {
  return cronParseExpression(expression, options);
}
