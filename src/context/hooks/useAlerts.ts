import type React from 'react';
import { useEffect, useRef } from 'react';
import { AppState, TabType } from '../../types';
import { getTodayStr } from '../../lib/dateUtils';
import { startTicker } from '../../lib/ticker';
import {
  AlertActionId,
  AlertActionMessage,
  AlertPayload,
  SW_ALERT_MESSAGE,
  buildEventAlert,
  registerAlertWorker
} from '../../lib/notify';
import { focusMainWindow, isTauri, listenForAlertActions, listenForAlertFired } from '../../lib/desktop';
import { playChime as playPhaseChime } from '../../lib/audio';
import { TIMING } from '../../constants/timing';
import type { AuthStatus } from './useAuthSession';
import type { AlertState } from './useAlertState';

interface AlertsDeps {
  authStatus: AuthStatus;
  stateRef: React.MutableRefObject<AppState>;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  alerts: Pick<AlertState, 'setActiveAlert' | 'stopRinging' | 'ringBell' | 'deliverAlert'>;
  syncTimerRef: React.MutableRefObject<() => void>;
  toggleTimerRef: React.MutableRefObject<() => void>;
  setActiveSessionRef: React.MutableRefObject<(id: string) => void>;
  setActiveTab: (tab: TabType) => void;
}

/**
 * Alert buttons (in-app island, desktop island window, browser notification)
 * and calendar reminders. Every effect dep except authStatus is stable.
 */
export function useAlerts({
  authStatus,
  stateRef,
  setState,
  alerts,
  syncTimerRef,
  toggleTimerRef,
  setActiveSessionRef,
  setActiveTab
}: AlertsDeps) {
  const { setActiveAlert, stopRinging, ringBell, deliverAlert } = alerts;

  /** Starts the timer only if it isn't already running (alert buttons). */
  const startTimerIfIdle = () => {
    syncTimerRef.current();
    // Runs after the sync's state update, so a just-finished phase is idle by now.
    setTimeout(() => {
      if (stateRef.current.timer.status !== 'running') toggleTimerRef.current();
    }, 0);
  };

  const runAlertAction = (action: AlertActionId, payload?: AlertPayload | null) => {
    setActiveAlert(null);
    stopRinging();
    if (action === 'start-next') {
      startTimerIfIdle();
    } else if (action === 'start-session' && payload?.sessionId) {
      setActiveTab('timer');
      setActiveSessionRef.current(payload.sessionId);
      setTimeout(() => toggleTimerRef.current(), 0);
    } else if (action === 'open-app' && payload?.kind === 'event-soon') {
      setActiveTab('calendar');
    }
    if (isTauri()) focusMainWindow().catch(() => {});
    else window.focus();
  };
  const runAlertActionRef = useRef(runAlertAction);
  runAlertActionRef.current = runAlertAction;

  // Desktop: Rust fired an alert, and the island window reports button presses.
  useEffect(() => {
    if (!isTauri() || authStatus !== 'authenticated') return;
    const unlisteners: Promise<() => void>[] = [
      listenForAlertFired(({ payload, inFront }) => {
        syncTimerRef.current();
        if (inFront) setActiveAlert(payload);
      }),
      listenForAlertActions((msg: AlertActionMessage) => {
        if (msg.action !== 'dismiss') runAlertActionRef.current(msg.action, msg.payload);
      })
    ];
    return () => unlisteners.forEach(p => p.then(fn => fn()).catch(() => {}));
  }, [authStatus, setActiveAlert, syncTimerRef]);

  // Web: buttons on a browser notification come back through the service worker.
  useEffect(() => {
    if (isTauri() || authStatus !== 'authenticated' || !('serviceWorker' in navigator)) return;
    registerAlertWorker();
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string } & Partial<AlertActionMessage>;
      if (data?.type !== SW_ALERT_MESSAGE || !data.action || data.action === 'dismiss') return;
      runAlertActionRef.current(data.action, data.payload ?? null);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [authStatus]);

  // Calendar reminders: a heads-up `leadMinutes` before each scheduled session today.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const check = () => {
      const n = stateRef.current.notifications;
      if (!n.enabled) return;
      const today = getTodayStr();
      const now = Date.now();
      const due = stateRef.current.calendarEvents.filter(ev => {
        if (ev.date !== today || ev.notified) return false;
        const [h, m] = ev.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(h || 0, m || 0, 0, 0);
        const diff = start.getTime() - now;
        // Within the lead time, and not more than 2 minutes past the start.
        return diff > -120_000 && diff <= n.leadMinutes * 60_000;
      });
      if (!due.length) return;
      setState(prev => ({
        ...prev,
        calendarEvents: prev.calendarEvents.map(ev => (due.some(d => d.id === ev.id) ? { ...ev, notified: true } : ev))
      }));
      due.forEach(ev => {
        const [h, m] = ev.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(h || 0, m || 0, 0, 0);
        if (n.sound && stateRef.current.sound) playPhaseChime('focus');
        ringBell();
        deliverAlert(buildEventAlert(ev, Math.round((start.getTime() - now) / 60_000), n));
      });
    };
    check();
    const stop = startTicker(check, TIMING.eventCheckMs);
    return stop;
  }, [authStatus, stateRef, setState, ringBell, deliverAlert]);

  return { runAlertAction };
}
