import { useEffect } from 'react';

/**
 * Registry of overlays that pause the app-wide keyboard shortcuts (modals,
 * menus, the celebration). Overlays report themselves while they are on
 * screen, so shortcuts don't depend on CSS class names.
 */
let openCount = 0;

/** Registers the calling overlay as blocking while `active` is true. */
export function useBlockingOverlay(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    openCount++;
    return () => {
      openCount--;
    };
  }, [active]);
}

export function isBlockingOverlayOpen(): boolean {
  return openCount > 0;
}
