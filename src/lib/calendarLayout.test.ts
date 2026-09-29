import { describe, expect, it } from 'vitest';
import { layoutDayEvents } from './calendarLayout';

const ev = (id: string, startTime: string, durationMins: number) => ({ id, startTime, durationMins });

describe('layoutDayEvents', () => {
  it('gives events that never overlap the full width', () => {
    const slots = layoutDayEvents([ev('a', '09:00', 60), ev('b', '10:00', 30)]);
    expect(slots.get('a')).toEqual({ column: 0, columns: 1 });
    expect(slots.get('b')).toEqual({ column: 0, columns: 1 });
  });

  it('puts an exact duplicate next to the original', () => {
    const slots = layoutDayEvents([ev('a', '09:00', 50), ev('copy', '09:00', 50)]);
    expect([slots.get('a'), slots.get('copy')]).toEqual([{ column: 0, columns: 2 }, { column: 1, columns: 2 }]);
  });

  it('reuses a column that frees up, and sizes the whole chained group alike', () => {
    // a 9:00–10:00, b 9:30–10:30, c 10:00–11:00: c takes a's column back.
    const slots = layoutDayEvents([ev('a', '09:00', 60), ev('b', '09:30', 60), ev('c', '10:00', 60)]);
    expect(slots.get('a')).toEqual({ column: 0, columns: 2 });
    expect(slots.get('b')).toEqual({ column: 1, columns: 2 });
    expect(slots.get('c')).toEqual({ column: 0, columns: 2 });
  });

  it('starts a new group after a gap', () => {
    const slots = layoutDayEvents([ev('a', '09:00', 30), ev('b', '09:00', 30), ev('c', '13:00', 30)]);
    expect(slots.get('c')).toEqual({ column: 0, columns: 1 });
  });
});
