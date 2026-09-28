import type React from 'react';
import { useEffect, useRef } from 'react';
import { AppState, TimerPhase } from '../../types';
import { strings } from '../../constants/strings';
import { getTodayStr } from '../../lib/dateUtils';
import { startTicker } from '../../lib/ticker';
import { buildPhaseAlert } from '../../lib/notify';
import { cancelDesktopAlert, isTauri, scheduleDesktopAlert } from '../../lib/desktop';
import { clearTimerRun, saveTimerRun } from '../../lib/storage';
import { playChime as playPhaseChime } from '../../lib/audio';
import { TIMING } from '../../constants/timing';
import { uid } from '../../lib/id';
import { phaseMinutes } from '../../lib/sessionTime';
import type { AlertState } from './useAlertState';

interface TimerEngineDeps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (message: string) => void;
  /** When the running phase ends (ms since epoch), or null when not running. */
  targetEndTimeRef: React.MutableRefObject<number | null>;
  alerts: Pick<AlertState, 'ringBell' | 'deliverAlert'>;
}

/**
 * The focus/break timer: a wall-clock ticker (drift-free, background-resilient),
 * phase completion, the desktop alert mirror, and the timer controls.
 */
export function useTimerEngine({ state, setState, showToast, targetEndTimeRef, alerts }: TimerEngineDeps) {
  const { ringBell, deliverAlert } = alerts;

  const playChime = (phase: TimerPhase = 'focus') => {
    if (state.sound) playPhaseChime(phase);
  };

  // Phase completion handler
  const handlePhaseComplete = (skipped = false) => {
    targetEndTimeRef.current = null;
    clearTimerRun();
    const currentSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
    const isFocus = state.timer.phase === 'focus';

    if (isFocus) {
      if (!skipped) {
        playChime('focus');
        announcePhaseEnd('focus');

        // Unlock session rewards
        if (currentSession) {
          setState(prev => ({
            ...prev,
            rewards: prev.rewards.map(r => {
              const isLinked =
                (currentSession.rewardId && r.id === currentSession.rewardId) ||
                (r.linkedSessionId && r.linkedSessionId === currentSession.id) ||
                (r.trigger === 'session' && r.linkedId === currentSession.id);
              return isLinked && r.status === 'locked' ? { ...r, status: 'ready' } : r;
            })
          }));
        }

        // Log session
        const newLog = {
          id: uid(),
          sessionId: currentSession?.id || 'custom',
          sessionName: currentSession?.name || 'Focus Session',
          durationMins: phaseMinutes(currentSession, 'focus'),
          date: getTodayStr(),
          timestamp: Date.now(),
          dayOfWeek: new Date().getDay()
        };

        setState(prev => ({
          ...prev,
          sessionLogs: [...prev.sessionLogs, newLog]
        }));
      }

      // Switch to break
      const breakMins = phaseMinutes(currentSession, 'break');
      const breakSecs = breakMins * 60;
      setState(prev => ({
        ...prev,
        activeActivityStartTime: null,
        timer: {
          phase: 'break',
          status: 'idle',
          remaining: breakSecs,
          total: breakSecs,
          sessionsCompletedToday: skipped ? prev.timer.sessionsCompletedToday : prev.timer.sessionsCompletedToday + 1
        }
      }));
    } else {
      // Was break, switch to focus
      if (!skipped) {
        playChime('break');
        announcePhaseEnd('break');
      }

      const focusMins = phaseMinutes(currentSession, 'focus');
      const focusSecs = focusMins * 60;
      setState(prev => ({
        ...prev,
        activeActivityStartTime: null,
        timer: {
          ...prev.timer,
          phase: 'focus',
          status: 'idle',
          remaining: focusSecs,
          total: focusSecs
        }
      }));
    }
  };

  // Rings the bell, then alerts (or falls back to the old toast when alerts are off).
  // On desktop the alert itself comes from Rust's timer, which isn't throttled.
  const announcePhaseEnd = (endedPhase: TimerPhase) => {
    ringBell();
    const n = state.notifications;
    if (!n.phaseAlerts) {
      showToast(endedPhase === 'focus' ? strings.toasts.focusComplete : strings.toasts.breakOver);
      return;
    }
    if (!isTauri()) deliverAlert(buildPhaseAlert(endedPhase, n));
  };

  // Timer Wall-Clock Tick Engine (Drift-free, background-resilient)
  const timerRef = useRef<(() => void) | null>(null);
  // The ticker outlives renders; always call the latest completion handler.
  const handlePhaseCompleteRef = useRef(handlePhaseComplete);
  handlePhaseCompleteRef.current = handlePhaseComplete;

  useEffect(() => {
    if (state.timer.status === 'running') {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + state.timer.remaining * 1000;
        saveTimerRun({
              targetEndTime: targetEndTimeRef.current,
              phase: state.timer.phase,
              sessionId: state.activeSessionId,
              total: state.timer.total
            });
      }

      // Ticks from a worker so a hidden tab/minimized window still ends on time.
      timerRef.current = startTicker(() => {
        const targetEnd = targetEndTimeRef.current;
        if (!targetEnd) return;
        const now = Date.now();
        const remainingSecs = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        if (remainingSecs <= 0) {
          stopTicker();
          targetEndTimeRef.current = null;
          clearTimerRun();
          handlePhaseCompleteRef.current(false);
        } else {
          setState(prev => {
            if (prev.timer.status !== 'running' || prev.timer.remaining === remainingSecs) return prev;
            return {
              ...prev,
              timer: { ...prev.timer, remaining: remainingSecs }
            };
          });
        }
      }, TIMING.timerTickMs);
    } else {
      stopTicker();
    }

    return stopTicker;
    // Restarts only when the run itself changes. remaining/total are read once to set
    // the end time; re-running on every tick would reset the ticker each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timer.status, state.timer.phase, state.activeSessionId]);

  function stopTicker() {
    timerRef.current?.();
    timerRef.current = null;
  }

  // Desktop: mirror the running phase's end in Rust so the alert fires on time
  // even while WebView2 throttles this window.
  useEffect(() => {
    if (!isTauri()) return;
    const n = state.notifications;
    if (state.timer.status === 'running' && targetEndTimeRef.current && n.phaseAlerts) {
      scheduleDesktopAlert(targetEndTimeRef.current, buildPhaseAlert(state.timer.phase, n)).catch(() => {});
    } else {
      cancelDesktopAlert().catch(() => {});
    }
    // buildPhaseAlert reads only phaseAlerts and autoDismissSec, listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.timer.status,
    state.timer.phase,
    state.activeSessionId,
    state.notifications.phaseAlerts,
    state.notifications.autoDismissSec
  ]);

  // Re-reads the wall clock; completes the phase if it already elapsed
  const syncTimer = () => {
    if (state.timer.status === 'running' && targetEndTimeRef.current) {
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      if (remainingSecs <= 0) {
        targetEndTimeRef.current = null;
        clearTimerRun();
        handlePhaseComplete(false);
      } else {
        setState(prev => {
          if (prev.timer.status !== 'running' || prev.timer.remaining === remainingSecs) return prev;
          return {
            ...prev,
            timer: { ...prev.timer, remaining: remainingSecs }
          };
        });
      }
    }
  };

  const getTimerTargetEnd = () => targetEndTimeRef.current;
  const syncTimerRef = useRef(syncTimer);
  syncTimerRef.current = syncTimer;

  // Sync timer immediately on tab visibility / focus change
  useEffect(() => {
    const handleSync = () => syncTimerRef.current();

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('pageshow', handleSync);

    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('pageshow', handleSync);
    };
  }, []);

  // Timer Controls
  const toggleTimer = () => {
    setState(prev => {
      const isRunning = prev.timer.status === 'running';
      if (isRunning) {
        const currentRemaining = targetEndTimeRef.current
          ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
          : prev.timer.remaining;
        targetEndTimeRef.current = null;
        clearTimerRun();
        return {
          ...prev,
          timer: { ...prev.timer, status: 'paused', remaining: currentRemaining }
        };
      }

      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      const mins = phaseMinutes(activeSession, prev.timer.phase);
      const expectedTotal = mins * 60;

      let remaining = prev.timer.remaining;
      let total = prev.timer.total;

      if (remaining <= 0 || isNaN(remaining)) {
        remaining = expectedTotal;
        total = expectedTotal;
      }
      if (total <= 0 || isNaN(total)) {
        total = expectedTotal;
      }

      const targetEndTime = Date.now() + remaining * 1000;
      targetEndTimeRef.current = targetEndTime;
      saveTimerRun({
            targetEndTime,
            phase: prev.timer.phase,
            sessionId: prev.activeSessionId,
            total
          });

      return {
        ...prev,
        activeActivityStartTime: !prev.activeActivityStartTime ? Date.now() : prev.activeActivityStartTime,
        timer: {
          ...prev.timer,
          status: 'running',
          remaining,
          total
        }
      };
    });
  };

  const resetTimer = () => {
    stopTicker();
    targetEndTimeRef.current = null;
    clearTimerRun();
    setState(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      const mins = phaseMinutes(activeSession, 'focus');
      const total = mins * 60;
      return {
        ...prev,
        activeActivityStartTime: null,
        timer: {
          ...prev.timer,
          phase: 'focus',
          status: 'idle',
          remaining: total,
          total
        }
      };
    });
  };

  const skipPhase = () => {
    stopTicker();
    targetEndTimeRef.current = null;
    clearTimerRun();
    handlePhaseComplete(true);
  };

  const toggleSound = () => setState(prev => ({ ...prev, sound: !prev.sound }));

  const toggleTimerRef = useRef(toggleTimer);
  toggleTimerRef.current = toggleTimer;

  return { toggleTimer, resetTimer, skipPhase, toggleSound, syncTimer, getTimerTargetEnd, syncTimerRef, toggleTimerRef };
}
