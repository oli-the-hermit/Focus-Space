import React, { useEffect, useState } from 'react';
import { strings } from '../../constants/strings';
import { closeCurrentWindow, minimizeWindow, toggleMaximizeWindow, watchMaximized } from '../../lib/desktop';
import { IconClose, IconMaximize, IconMinimize, IconRestore } from '../ui/icons';
import { WindowButton } from '../ui/WindowButton';

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
      <WindowButton onClick={run(minimizeWindow)} label={strings.windowControls.minimize}>
        <IconMinimize size={16} />
      </WindowButton>
      <WindowButton
        onClick={run(toggleMaximizeWindow)}
        label={maximized ? strings.windowControls.restore : strings.windowControls.maximize}
      >
        {maximized ? <IconRestore size={15} /> : <IconMaximize size={14} />}
      </WindowButton>
      <WindowButton danger onClick={run(closeCurrentWindow)} label={strings.common.close}>
        <IconClose size={17} />
      </WindowButton>
    </div>
  );
};
