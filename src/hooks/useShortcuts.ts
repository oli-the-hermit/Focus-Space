import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useMiniPlayer } from '../mini/MiniPlayerProvider';
import { isBlockingOverlayOpen } from '../lib/overlays';
import { shortcutForKey } from '../constants/shortcuts';

/** Typing in a field (or any editable element) never triggers a shortcut. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * App-wide single-key shortcuts, defined in constants/shortcuts.ts:
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

      let handled = true;
      switch (shortcutForKey(e.key)) {
        case 'toggleTimer':
          // A focused button handles Space itself (it's a click).
          if ((e.target as HTMLElement)?.closest('button, [role="button"], a')) return;
          app.toggleTimer();
          break;
        case 'skip':
          app.skipPhase();
          break;
        case 'reset':
          app.resetTimer();
          break;
        case 'newSession':
          app.openModal('NEW_SESSION');
          break;
        case 'miniPlayer':
          if (mini.supported) mini.toggle();
          break;
        case 'help':
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
