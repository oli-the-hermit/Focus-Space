import { useCallback, useRef, useState } from 'react';
import { AlertPayload, pageIsInFront, showWebNotification } from '../../lib/notify';
import { isTauri, showDesktopAlert } from '../../lib/desktop';
import { TIMING } from '../../constants/timing';

/**
 * The in-app alert island and the ringing bell. No effects: the timer engine and
 * the alert listeners (useAlerts) both deliver through it. Its functions use only
 * setters and a ref, so they keep one identity and can sit in effect deps.
 */
export function useAlertState() {
  const [alertRinging, setAlertRinging] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const ringingTimerRef = useRef<number | undefined>(undefined);

  const ringBell = useCallback(() => {
    window.clearTimeout(ringingTimerRef.current);
    setAlertRinging(true);
    ringingTimerRef.current = window.setTimeout(() => setAlertRinging(false), TIMING.alertRingingMs);
  }, []);

  const stopRinging = useCallback(() => {
    window.clearTimeout(ringingTimerRef.current);
    setAlertRinging(false);
  }, []);

  /**
   * Web delivery: an island inside the page when it's in front, otherwise a
   * browser notification (with buttons). Desktop alerts are routed by Rust.
   */
  const deliverAlert = useCallback((payload: AlertPayload) => {
    if (isTauri()) {
      showDesktopAlert(payload).catch(() => setActiveAlert(payload));
      return;
    }
    if (pageIsInFront()) {
      setActiveAlert(payload);
      return;
    }
    showWebNotification(payload).then(shown => {
      if (!shown) setActiveAlert(payload);
    });
  }, []);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  return { alertRinging, activeAlert, setActiveAlert, ringBell, stopRinging, deliverAlert, dismissAlert };
}

export type AlertState = ReturnType<typeof useAlertState>;
