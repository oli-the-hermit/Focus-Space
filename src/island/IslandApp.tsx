import React, { useEffect, useState } from 'react';
import { AlertCard } from '../components/alerts/AlertCard';
import type { AlertActionId, AlertPayload } from '../lib/notify';
import { closeCurrentWindow, listenForAlertShow, sendAlertAction, takePendingAlert } from '../lib/desktop';
import { applyTheme, cachedAccent, cachedTheme } from '../lib/theme';
import { TIMING } from '../constants/timing';

/**
 * The desktop alert window (index.html#island): frameless, always on top, opened
 * by Rust when a phase ends while the app is in the background. Buttons are sent
 * back to the main window, which owns the timer.
 */
export const IslandApp: React.FC = () => {
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('island-root');
    applyTheme(cachedTheme() ?? 'system', cachedAccent());

    const off = listenForAlertShow(setPayload);
    takePendingAlert()
      .then(p => p && setPayload(p))
      .catch(() => {});
    return () => {
      off.then(fn => fn()).catch(() => {});
    };
  }, []);

  // Never leave an empty window on screen: close it if no alert arrives.
  useEffect(() => {
    if (payload) return;
    const t = window.setTimeout(() => void closeCurrentWindow().catch(() => {}), TIMING.islandEmptyCloseMs);
    return () => window.clearTimeout(t);
  }, [payload]);

  const close = () => void closeCurrentWindow().catch(() => {});

  const act = (action: AlertActionId) => {
    if (!payload) return;
    sendAlertAction({ action, payload })
      .catch(() => {})
      .finally(close);
  };

  if (!payload) return null;
  return <AlertCard payload={payload} onAction={act} onDismiss={close} standalone />;
};
