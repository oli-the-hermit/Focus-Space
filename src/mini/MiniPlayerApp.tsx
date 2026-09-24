import React, { useCallback, useEffect, useState } from 'react';
import { MiniPlayer } from './MiniPlayer';
import { TimerSnapshot } from '../lib/timerSnapshot';
import {
  MiniCommand,
  closeCurrentWindow,
  listenForSnapshots,
  loadMiniPrefs,
  saveMiniPrefs,
  sendCommandToMain,
  setMiniAlwaysOnTop,
  trackMiniPosition
} from '../lib/desktop';

/**
 * Root of the Tauri mini-player window (`?view=mini`). It holds no app data:
 * it mirrors snapshots pushed by the main window and sends commands back.
 */
export const MiniPlayerApp: React.FC = () => {
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
  const [prefs, setPrefs] = useState(loadMiniPrefs);

  useEffect(() => {
    document.documentElement.classList.add('mini-root');
    // Paint with the cached theme until the first snapshot arrives.
    try {
      const cached = localStorage.getItem('focusspace_theme_cache');
      const resolved = cached === 'light' || cached === 'dark'
        ? cached
        : window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = resolved;
    } catch {}
    let unlistenState: (() => void) | undefined;
    let unlistenMove: (() => void) | undefined;
    let cancelled = false;

    listenForSnapshots(s => setSnapshot(s)).then(fn => {
      if (cancelled) fn();
      else {
        unlistenState = fn;
        sendCommandToMain('request-state');
      }
    });
    trackMiniPosition().then(fn => {
      if (cancelled) fn();
      else unlistenMove = fn;
    });

    return () => {
      cancelled = true;
      unlistenState?.();
      unlistenMove?.();
    };
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    document.documentElement.dataset.theme = snapshot.theme;
    document.documentElement.style.colorScheme = snapshot.theme;
  }, [snapshot?.theme]);

  const onCommand = useCallback((cmd: MiniCommand) => {
    sendCommandToMain(cmd);
  }, []);

  const handleClose = async () => {
    // Closing only removes this window; the timer lives in the main window.
    await sendCommandToMain('closed');
    await closeCurrentWindow();
  };

  return (
    <MiniPlayer
      snapshot={snapshot}
      onCommand={onCommand}
      draggable={!prefs.pinned}
      controls={{
        pinned: prefs.pinned,
        alwaysOnTop: prefs.alwaysOnTop,
        onTogglePin: () => setPrefs(saveMiniPrefs({ pinned: !prefs.pinned })),
        onToggleAlwaysOnTop: () => {
          const next = !prefs.alwaysOnTop;
          setMiniAlwaysOnTop(next);
          setPrefs(saveMiniPrefs({ alwaysOnTop: next }));
        },
        onExpand: () => sendCommandToMain('focus-main'),
        onClose: handleClose
      }}
    />
  );
};
