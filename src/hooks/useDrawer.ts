import { useSyncExternalStore } from 'react';
import { storage } from '../lib/storage';
import { useMediaQuery } from './useMediaQuery';

/** The expanded drawer needs room; below this the rail is used (tokens.css: lg). */
const EXPANDABLE_QUERY = '(min-width: 1024px)';

// One choice for the whole window, shared by the drawer and its toggle in the top bar.
let wantExpanded = storage.get('drawer') === 'expanded';
const listeners = new Set<() => void>();

function setWantExpanded(next: boolean) {
  wantExpanded = next;
  storage.set('drawer', next ? 'expanded' : 'rail');
  listeners.forEach(l => l());
}

/**
 * The navigation drawer's state: expanded (labels beside the icons) or the rail. The
 * choice is remembered per device; below lg there's no room, so it's always the rail.
 */
export function useDrawer() {
  const want = useSyncExternalStore(
    onChange => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => wantExpanded
  );
  const canExpand = useMediaQuery(EXPANDABLE_QUERY);
  return {
    canExpand,
    expanded: want && canExpand,
    toggle: () => setWantExpanded(!wantExpanded)
  };
}
