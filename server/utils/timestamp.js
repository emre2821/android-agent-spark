/**
 * Centralized timestamp utilities
 */

/**
 * Generate current timestamp in ISO 8601 format
 * @returns {string} ISO 8601 timestamp string
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * Format a relative time string from an ISO 8601 timestamp
 * @param {string} isoString - ISO 8601 timestamp string
 * @returns {string} Human-readable relative time string
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return 'Unknown';
  const target = new Date(isoString);
  if (Number.isNaN(target.getTime())) {
    return 'Unknown';
  }
  const diff = Date.now() - target.getTime();
  const minutes = Math.round(diff / (60 * 1000));
  if (minutes <= 0) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
