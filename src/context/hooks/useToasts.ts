import { useRef, useState } from 'react';
import type { ShowToast, ToastTone } from '../../types';
import { TIMING } from '../../constants/timing';
import { cssDurationMs } from '../../lib/theme';
import { uid } from '../../lib/id';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  /** Playing its exit animation; removed shortly after. */
  leaving?: boolean;
}

/** Most important first: the bell dot takes the color of the highest unseen tone. */
const PRIORITY: readonly ToastTone[] = ['error', 'warning', 'info', 'success'];

/**
 * Toasts, and the dot on the bell that remembers them: it shows the most important
 * tone since the bell was last opened, and fades by itself a while after the last toast.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [bellDot, setBellDot] = useState<ToastTone | null>(null);
  const dotTimer = useRef<number | undefined>(undefined);

  const showToast: ShowToast = (message, tone = 'success') => {
    const id = uid();
    setToasts(prev => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
      // Removed once the slide-out transition (--dur-2 in toast.css) has played.
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), cssDurationMs('--dur-2'));
    }, TIMING.toastVisibleMs);

    setBellDot(prev => (prev && PRIORITY.indexOf(prev) < PRIORITY.indexOf(tone) ? prev : tone));
    window.clearTimeout(dotTimer.current);
    dotTimer.current = window.setTimeout(() => setBellDot(null), TIMING.bellDotMs);
  };

  const clearBellDot = () => {
    window.clearTimeout(dotTimer.current);
    setBellDot(null);
  };

  return { toasts, showToast, bellDot, clearBellDot };
}
