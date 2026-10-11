import { storage } from './storage';

/** How many recently opened lists the list pickers show on top. */
export const RECENT_LISTS_MAX = 3;

/** Task lists opened on this device, newest first (ids; lists deleted since are skipped by the pickers). */
export function recentLists(): string[] {
  const v = storage.getJSON<unknown[]>('recentLists');
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Remembers an opened list: picked in a list picker, or opened on the Tasks tab. */
export function pushRecentList(id: string): void {
  // A few extra, so deleted lists don't leave the group short.
  storage.setJSON('recentLists', [id, ...recentLists().filter(x => x !== id)].slice(0, RECENT_LISTS_MAX * 3));
}
