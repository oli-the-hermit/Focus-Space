import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useMiniPlayer } from '../mini/MiniPlayerProvider';
import { isBlockingOverlayOpen } from '../lib/overlays';

/** Typing in a field (or any editable element) never triggers a shortcut. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * App-wide single-key shortcuts (listed in Help → Keyboard shortcuts):
 * Space play/pause · S skip · R reset · N new session · M mini player · ? help.
 * Paused while a dialog, the tour or a menu is open.
 */
export function useShortcuts() {
  const app = useApp();
  const mini = useMiniPlayer();
  const ref = useRef({ app, mini });
  ref.current = { app, mini };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;
      const { app, mini } = ref.current;
      if (app.tourActive || app.helpOpen || app.activeModal) return;
      if (isBlockingOverlayOpen()) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let handled = true;
      switch (key) {
        case ' ':
          // A focused button handles Space itself (it's a click).
          if ((e.target as HTMLElement)?.closest('button, [role="button"], a')) return;
          app.toggleTimer();
          break;
        case 's':
          app.skipPhase();
          break;
        case 'r':
          app.resetTimer();
          break;
        case 'n':
          app.openModal('NEW_SESSION');
          break;
        case 'm':
          if (mini.supported) mini.toggle();
          break;
        case '?':
          app.setHelpOpen(true);
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
