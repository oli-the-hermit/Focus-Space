import React, { useEffect, useState } from 'react';
import { AlertCard } from '../components/alerts/AlertCard';
import type { AlertActionId, AlertPayload } from '../lib/notify';
import { closeCurrentWindow, listenForAlertShow, sendAlertAction, takePendingAlert } from '../lib/desktop';

const THEME_CACHE_KEY = 'focusspace_theme_cache';

function applyCachedTheme() {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    const resolved =
      cached === 'light' || cached === 'dark'
        ? cached
        : window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch {}
}

/**
 * The desktop alert window (index.html#island): frameless, always on top, opened
 * by Rust when a phase ends while the app is in the background. Buttons are sent
 * back to the main window, which owns the timer.
 */
export const IslandApp: React.FC = () => {
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('island-root');
    applyCachedTheme();

    const off = listenForAlertShow(setPayload);
    takePendingAlert()
      .then(p => p && setPayload(p))
      .catch(() => {});
    return () => {
      off.then(fn => fn()).catch(() => {});
    };
  }, []);

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
