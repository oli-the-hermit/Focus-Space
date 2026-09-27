import { useLayoutEffect, useRef } from 'react';

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Ids that appeared after the first render. Rows use it to play an enter
 * animation only when they're newly created, not on every page load.
 */
export function useNewIds(ids: string[]): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const fresh = useRef(new Set<string>());
  if (seen.current === null) {
    seen.current = new Set(ids);
  } else {
    for (const id of ids) {
      if (!seen.current.has(id)) {
        seen.current.add(id);
        fresh.current.add(id);
      }
    }
  }
  return fresh.current;
}

/**
 * FLIP: when the order of a list's rows changes (drag and drop, duplicate),
 * rows glide to their new place instead of jumping. Rows need a `data-id`.
 */
export function useFlip(containerRef: React.RefObject<HTMLElement>, ids: string[]) {
  const positions = useRef(new Map<string, number>());
  const orderKey = ids.join('|');

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    if (base.height === 0) return; // hidden page: measure next time it's shown
    const next = new Map<string, number>();
    const animate = !reducedMotion();
    for (const child of Array.from(container.children) as HTMLElement[]) {
      const id = child.dataset.id;
      if (!id) continue;
      const top = child.getBoundingClientRect().top - base.top;
      next.set(id, top);
      const old = positions.current.get(id);
      if (animate && old !== undefined && Math.abs(old - top) > 1) {
        child.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'none' }], {
          duration: 260,
          easing: 'cubic-bezier(0.2, 0, 0, 1)'
        });
      }
    }
    positions.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);
}
