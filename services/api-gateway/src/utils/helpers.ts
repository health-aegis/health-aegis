/**
 * Format a date as YYYY-MM-DD
 */
export const formatDate = (date: Date): string =>
  date.toISOString().split('T')[0];

/**
 * Format a time as HH:MM (24h)
 */
export const formatTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};
