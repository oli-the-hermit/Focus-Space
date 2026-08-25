/**
 * Formats a Date object as 'YYYY-MM-DD' using local time components.
 */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date in 'YYYY-MM-DD' local time.
 */
export function getTodayStr(): string {
  return formatDateStr(new Date());
}

/**
 * Parses a 'YYYY-MM-DD' string into a Date object initialized at local midnight.
 */
export function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Returns the number of days in a given month of a year (month is 0-indexed: 0 = Jan, 11 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns an array of 7 'YYYY-MM-DD' date strings starting from Monday for the given dateStr week.
 */
export function getWeekRange(dateStr: string): string[] {
  const d = parseDateStr(dateStr);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diffToMon);
  const week: string[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    week.push(formatDateStr(next));
  }
  return week;
}
