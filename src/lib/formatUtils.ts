/**
 * Formats seconds into a human-readable duration string.
 * Examples: 45 -> "45s", 120 -> "2m", 135 -> "2m 15s"
 */
export function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
