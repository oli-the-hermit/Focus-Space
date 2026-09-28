import React, { useEffect, useState } from 'react';
import { strings } from '../../constants/strings';
import { closeCurrentWindow, minimizeWindow, toggleMaximizeWindow, watchMaximized } from '../../lib/desktop';
import { IconClose, IconMaximize, IconMinimize, IconRestore } from '../ui/icons';

/**
 * Minimize / maximize / close for the frameless desktop window. Rendered only
 * under Tauri; the browser keeps its own window chrome.
 */
export const WindowControls: React.FC = () => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    watchMaximized(setMaximized)
      .then(fn => (cancelled ? fn() : (off = fn)))
      .catch(() => {});
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  const run = (fn: () => Promise<void>) => () => void fn().catch(() => {});

  return (
    <div className="window-controls" role="group">
      <button
        type="button"
        className="window-btn"
        onClick={run(minimizeWindow)}
        title={strings.windowControls.minimize}
        aria-label={strings.windowControls.minimize}
      >
        <IconMinimize size={16} />
      </button>
      <button
        type="button"
        className="window-btn"
        onClick={run(toggleMaximizeWindow)}
        title={maximized ? strings.windowControls.restore : strings.windowControls.maximize}
        aria-label={maximized ? strings.windowControls.restore : strings.windowControls.maximize}
      >
        {maximized ? <IconRestore size={15} /> : <IconMaximize size={14} />}
      </button>
      <button
        type="button"
        className="window-btn is-close"
        onClick={run(closeCurrentWindow)}
        title={strings.common.close}
        aria-label={strings.common.close}
      >
        <IconClose size={17} />
      </button>
    </div>
  );
};
