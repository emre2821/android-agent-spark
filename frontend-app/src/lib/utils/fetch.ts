/**
 * Shared fetch utilities for error handling and response parsing
 */

/**
 * Parse response text as JSON or return text
 */
export function parseResponseText(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Extract error message from response data
 */
export function extractErrorMessage(
  data: unknown,
  fallback = 'Request failed'
): string {
  if (typeof data === 'string') {
    return data;
  }
  
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('message' in obj && typeof obj.message === 'string') {
      return obj.message;
    }
    if ('error' in obj && typeof obj.error === 'string') {
      return obj.error;
    }
  }
  
  return fallback;
}
