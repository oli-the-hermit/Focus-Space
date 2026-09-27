import { describe, expect, it } from 'vitest';
import { daysBetween, formatDateStr, getDaysInMonth, getWeekRange, parseDateStr } from './dateUtils';

describe('parseDateStr / formatDateStr', () => {
  it('round-trips a local date', () => {
    expect(formatDateStr(parseDateStr('2026-09-28'))).toBe('2026-09-28');
  });

  it('parses at local midnight', () => {
    const d = parseDateStr('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
  });
});

describe('daysBetween', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-09-28', '2026-10-04')).toBe(6);
    expect(daysBetween('2026-10-04', '2026-09-28')).toBe(-6);
  });

  it('is not thrown off by a DST change', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });
});

describe('getDaysInMonth', () => {
  it('handles leap years', () => {
    expect(getDaysInMonth(2028, 1)).toBe(29);
    expect(getDaysInMonth(2026, 1)).toBe(28);
  });
});

describe('getWeekRange', () => {
  it('starts on Monday', () => {
    expect(getWeekRange('2026-09-30')).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'
    ]);
  });

  it('treats Sunday as the end of the week', () => {
    expect(getWeekRange('2026-10-04')[0]).toBe('2026-09-28');
  });
});
