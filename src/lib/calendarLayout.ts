/**
 * Side-by-side columns for events that overlap in time on one day (week and
 * day views), so none hides behind another. Events that overlap, directly or
 * through a chain, form a group; each takes the first column that's free at its
 * start, and the group's width is split evenly across its columns.
 */
import type { CalendarEvent } from '../types';

export interface EventSlot {
  /** 0-based column within the event's group. */
  column: number;
  /** How many columns the group needs. */
  columns: number;
}

type Timed = Pick<CalendarEvent, 'id' | 'startTime' | 'durationMins'>;

const startMinutes = (e: Timed) => {
  const [h, m] = e.startTime.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function layoutDayEvents(events: Timed[]): Map<string, EventSlot> {
  const sorted = [...events]
    .map(e => ({ id: e.id, start: startMinutes(e), end: startMinutes(e) + Math.max(1, e.durationMins) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const slots = new Map<string, EventSlot>();
  let group: { id: string; column: number }[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const g of group) slots.set(g.id, { column: g.column, columns: columnEnds.length });
    group = [];
    columnEnds = [];
  };

  for (const e of sorted) {
    if (e.start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex(end => end <= e.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(e.end);
    } else {
      columnEnds[column] = e.end;
    }
    group.push({ id: e.id, column });
    groupEnd = Math.max(groupEnd, e.end);
  }
  closeGroup();
  return slots;
}
