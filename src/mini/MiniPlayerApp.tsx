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
  trackMiniPosition,
  trackMiniSize
} from '../lib/desktop';
import { applyTheme, cachedTheme } from '../lib/theme';

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
    applyTheme(cachedTheme() ?? 'system');
    let unlistenState: (() => void) | undefined;
    let unlistenMove: (() => void) | undefined;
    let unlistenSize: (() => void) | undefined;
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
    trackMiniSize().then(fn => {
      if (cancelled) fn();
      else unlistenSize = fn;
    });

    return () => {
      cancelled = true;
      unlistenState?.();
      unlistenMove?.();
      unlistenSize?.();
    };
  }, []);

  const snapshotTheme = snapshot?.theme;
  useEffect(() => {
    if (snapshotTheme) applyTheme(snapshotTheme);
  }, [snapshotTheme]);

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
