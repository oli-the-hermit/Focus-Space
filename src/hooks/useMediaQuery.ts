import { useSyncExternalStore } from 'react';

/** Whether a CSS media query matches now, updating when it changes (e.g. '(min-width: 1024px)'). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener('change', onChange);
      return () => mq?.removeEventListener('change', onChange);
    },
    () => !!window.matchMedia?.(query).matches,
    () => false
  );
}
