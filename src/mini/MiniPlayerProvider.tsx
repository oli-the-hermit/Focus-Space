import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { buildTimerSnapshot } from '../lib/timerSnapshot';
import {
  MINI_HEIGHT,
  MINI_WIDTH,
  MiniCommand,
  attachExistingDesktopMini,
  closeDesktopMini,
  focusMainWindow,
  isTauri,
  listenForMiniCommands,
  openDesktopMini,
  sendSnapshotToMini
} from '../lib/desktop';
import { strings } from '../constants/strings';
import { MiniPlayer } from './MiniPlayer';

type MiniMode = 'desktop' | 'pip' | null;

interface MiniPlayerContextValue {
  /** False when neither Tauri nor Document Picture-in-Picture is available. */
  supported: boolean;
  isOpen: boolean;
  toggle: () => void;
}

const MiniPlayerContext = createContext<MiniPlayerContextValue>({ supported: false, isOpen: false, toggle: () => {} });

interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

function getDocumentPip(): DocumentPictureInPicture | null {
  const w = window as unknown as { documentPictureInPicture?: DocumentPictureInPicture };
  return w.documentPictureInPicture ?? null;
}

/** Copies every stylesheet into the PiP document so the mini player renders identically. */
function copyStyles(target: Document) {
  Array.from(document.styleSheets).forEach(sheet => {
    try {
      const css = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
      const style = target.createElement('style');
      style.textContent = css;
      target.head.appendChild(style);
    } catch {
      // Cross-origin sheet (e.g. web fonts): link it instead of reading its rules.
      if (sheet.href) {
        const link = target.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        target.head.appendChild(link);
      }
    }
  });
}

export const MiniPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const app = useApp();
  const mode: MiniMode = isTauri() ? 'desktop' : getDocumentPip() ? 'pip' : null;

  const [isOpen, setIsOpen] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const snapshot = buildTimerSnapshot(app.state, app.getTimerTargetEnd(), strings.timer.noSession);
  const snapshotKey = JSON.stringify(snapshot);

  // Commands arrive asynchronously; always dispatch against the latest context.
  const appRef = useRef(app);
  appRef.current = app;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const handleCommand = useCallback((cmd: MiniCommand) => {
    const a = appRef.current;
    switch (cmd) {
      case 'toggle':
        a.toggleTimer();
        break;
      case 'reset':
        a.resetTimer();
        break;
      case 'skip':
        a.skipPhase();
        break;
      case 'toggle-sound':
        a.toggleSound();
        break;
      case 'sync':
        a.syncTimer();
        break;
      case 'focus-main':
        if (isTauri()) focusMainWindow();
        else window.focus();
        break;
      case 'request-state':
        setIsOpen(true);
        if (isTauri()) sendSnapshotToMini(snapshotRef.current);
        break;
      case 'closed':
        setIsOpen(false);
        break;
    }
  }, []);

  // Desktop: listen for mini-window commands for the lifetime of the app, and pick
  // up a mini window that is still open from before a reload.
  useEffect(() => {
    if (mode !== 'desktop') return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    listenForMiniCommands(handleCommand).then(fn => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    attachExistingDesktopMini(() => setIsOpen(false))
      .then(found => {
        if (found && !cancelled) setIsOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [mode, handleCommand]);

  // Desktop: push every state change while the mini window is open.
  useEffect(() => {
    if (mode === 'desktop' && isOpen) sendSnapshotToMini(snapshotRef.current).catch(() => {});
  }, [mode, isOpen, snapshotKey]);

  // PiP: keep the theme in sync with the main document.
  useEffect(() => {
    if (!pipWindow) return;
    pipWindow.document.documentElement.dataset.theme = snapshot.theme;
    pipWindow.document.documentElement.style.colorScheme = snapshot.theme;
  }, [pipWindow, snapshot.theme]);

  const openPip = async () => {
    const pip = getDocumentPip();
    if (!pip) return;
    const win = await pip.requestWindow({ width: MINI_WIDTH, height: MINI_HEIGHT });
    copyStyles(win.document);
    win.document.documentElement.classList.add('mini-root');
    win.document.title = 'Focus Space';
    win.addEventListener('pagehide', () => {
      setPipWindow(null);
      setIsOpen(false);
    });
    setPipWindow(win);
    setIsOpen(true);
  };

  const toggle = async () => {
    try {
      if (mode === 'desktop') {
        if (isOpen) {
          await closeDesktopMini();
          setIsOpen(false);
        } else {
          await openDesktopMini(() => setIsOpen(false));
          setIsOpen(true);
        }
      } else if (mode === 'pip') {
        if (pipWindow) pipWindow.close();
        else await openPip();
      }
    } catch (err) {
      console.warn('Mini player failed:', err);
      app.showToast('Could not open the mini player.');
    }
  };

  const value = useMemo(
    () => ({ supported: mode !== null, isOpen, toggle }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, isOpen, pipWindow]
  );

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
      {pipWindow &&
        createPortal(
          <MiniPlayer
            snapshot={snapshot}
            onCommand={handleCommand}
            controls={{
              // Document PiP is always on top and positioned by the browser.
              onExpand: () => window.focus(),
              onClose: () => pipWindow.close()
            }}
          />,
          pipWindow.document.body
        )}
    </MiniPlayerContext.Provider>
  );
};

export const useMiniPlayer = () => useContext(MiniPlayerContext);
