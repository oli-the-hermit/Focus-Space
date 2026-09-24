import { parseDateStr } from './dateUtils';

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

/**
 * Formats seconds as a clock: 75 -> "01:15", 3725 -> "1:02:05".
 */
export function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * 'YYYY-MM-DD' -> "Wed, Sep 24" (the year is added when it isn't the current one).
 */
export function formatDateLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  });
}

/**
 * 'YYYY-MM-DD' -> "Sep 24" (the year is added when it isn't the current one).
 */
export function formatShortDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  });
}
