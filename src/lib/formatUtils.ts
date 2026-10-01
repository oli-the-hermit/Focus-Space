import { parseDateStr } from './dateUtils';
import { format, LOCALE } from './i18n';
import { strings } from '../constants/strings';

/**
 * Formats seconds into a human-readable duration string.
 * Examples: 45 -> "45s", 120 -> "2m", 135 -> "2m 15s"
 */
export function formatDuration(sec: number): string {
  const u = strings.units;
  if (!sec || sec <= 0) return format(u.seconds, { s: 0 });
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return format(u.seconds, { s });
  if (s === 0) return format(u.minutes, { m });
  return format(u.minutesSeconds, { m, s });
}

/**
 * Formats seconds as a minutes-and-seconds clock: 75 -> "01:15", 3600 -> "60:00".
 * Minutes run past 59 (sessions are set in minutes), so an hour counts down
 * 60:00 -> 59:59 instead of jumping from 1:00:00.
 */
export function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * 'YYYY-MM-DD' -> "Wed, Sep 24" (the year is added when it isn't the current one).
 */
export function formatDateLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(LOCALE, {
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
  return d.toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  });
}

/** Timestamp -> "Sep 24, 2026". */
export function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString(LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Timestamp -> "14:05": 24-hour, like the calendar and time pickers. */
export function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** "Ada Lovelace" -> "AL", "ada" -> "A", "" -> "?". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
