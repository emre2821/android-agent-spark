/**
 * Time formatting utilities
 */

/**
 * Format a relative time string from an ISO 8601 timestamp
 * @param isoString - ISO 8601 timestamp string
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
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
