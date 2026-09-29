import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
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
import { idleTimer, phaseMinutes, secondsUntil } from '../../lib/sessionTime';
import { unlockReward } from '../../lib/rewardLinks';
import type { AlertState } from './useAlertState';

interface TimerEngineDeps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (message: string) => void;
  alerts: Pick<AlertState, 'ringBell' | 'deliverAlert'>;
}

/**
 * The focus/break timer: a wall-clock ticker (drift-free, background-resilient),
 * phase completion, the desktop alert mirror, and the timer controls.
 *
 * `state.timer.endsAt` is the one source for when a run ends. State updaters stay
 * pure; effects mirror the run to storage (so a reload resumes it) and to Rust.
 */
export function useTimerEngine({ state, setState, showToast, alerts }: TimerEngineDeps) {
  const { ringBell, deliverAlert } = alerts;
  const { phase, status, total } = state.timer;
  /** When the current run ends, or null when the timer isn't running. */
  const runEnd = status === 'running' ? state.timer.endsAt : null;

  const playChime = (phase: TimerPhase = 'focus') => {
    if (state.sound) playPhaseChime(phase);
  };

  // Phase completion handler
  const handlePhaseComplete = (skipped = false) => {
    const currentSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
    const isFocus = state.timer.phase === 'focus';

    if (isFocus) {
      if (!skipped) {
        playChime('focus');
        announcePhaseEnd('focus');

        // Unlock the session's reward
        if (currentSession?.rewardId) {
          setState(prev => ({ ...prev, rewards: unlockReward(prev.rewards, currentSession.rewardId) }));
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
      setState(prev => ({
        ...prev,
        activeActivityStartTime: null,
        timer: {
          ...idleTimer(prev.timer, currentSession, 'break'),
          sessionsCompletedToday: skipped ? prev.timer.sessionsCompletedToday : prev.timer.sessionsCompletedToday + 1
        }
      }));
    } else {
      // Was break, switch to focus
      if (!skipped) {
        playChime('break');
        announcePhaseEnd('break');
      }

      setState(prev => ({
        ...prev,
        activeActivityStartTime: null,
        timer: idleTimer(prev.timer, currentSession, 'focus')
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

  /** Stops the ticker right away, before the state change that ends the run commits. */
  const stopTicker = useCallback(() => {
    timerRef.current?.();
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (runEnd === null) return;
    // Ticks from a worker so a hidden tab/minimized window still ends on time.
    const stop = startTicker(() => {
      const remainingSecs = secondsUntil(runEnd);
      if (remainingSecs <= 0) {
        stopTicker();
        handlePhaseCompleteRef.current(false);
      } else {
        setState(prev => {
          if (prev.timer.status !== 'running' || prev.timer.endsAt !== runEnd || prev.timer.remaining === remainingSecs) return prev;
          return {
            ...prev,
            timer: { ...prev.timer, remaining: remainingSecs }
          };
        });
      }
    }, TIMING.timerTickMs);
    timerRef.current = stop;
    return stopTicker;
  }, [runEnd, setState, stopTicker]);

  // Keep the run record in storage in step with the state, so a reload resumes the run.
  const savedRunRef = useRef(false);
  const activeSessionId = state.activeSessionId;
  useEffect(() => {
    if (runEnd !== null) {
      saveTimerRun({ targetEndTime: runEnd, phase, sessionId: activeSessionId, total });
      savedRunRef.current = true;
    } else if (savedRunRef.current) {
      // Only after a run of ours: on mount the record is still waiting to be restored.
      clearTimerRun();
      savedRunRef.current = false;
    }
  }, [runEnd, phase, activeSessionId, total]);

  // Desktop: mirror the running phase's end in Rust so the alert fires on time
  // even while WebView2 throttles this window.
  const { phaseAlerts, autoDismissSec } = state.notifications;
  useEffect(() => {
    if (!isTauri()) return;
    if (runEnd !== null && phaseAlerts) {
      scheduleDesktopAlert(runEnd, buildPhaseAlert(phase, { autoDismissSec })).catch(() => {});
    } else {
      cancelDesktopAlert().catch(() => {});
    }
  }, [runEnd, phase, phaseAlerts, autoDismissSec]);

  // Re-reads the wall clock; completes the phase if it already elapsed
  const syncTimer = () => {
    if (runEnd === null) return;
    const remainingSecs = secondsUntil(runEnd);
    if (remainingSecs <= 0) {
      stopTicker();
      handlePhaseComplete(false);
    } else {
      setState(prev => {
        if (prev.timer.status !== 'running' || prev.timer.endsAt !== runEnd || prev.timer.remaining === remainingSecs) return prev;
        return {
          ...prev,
          timer: { ...prev.timer, remaining: remainingSecs }
        };
      });
    }
  };

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
      if (prev.timer.status === 'running') {
        const remaining = prev.timer.endsAt !== null ? secondsUntil(prev.timer.endsAt) : prev.timer.remaining;
        return {
          ...prev,
          timer: { ...prev.timer, status: 'paused', remaining, endsAt: null }
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

      return {
        ...prev,
        activeActivityStartTime: !prev.activeActivityStartTime ? Date.now() : prev.activeActivityStartTime,
        timer: {
          ...prev.timer,
          status: 'running',
          remaining,
          total,
          endsAt: Date.now() + remaining * 1000
        }
      };
    });
  };

  const resetTimer = () => {
    stopTicker();
    setState(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      return {
        ...prev,
        activeActivityStartTime: null,
        timer: idleTimer(prev.timer, activeSession, 'focus')
      };
    });
  };

  const skipPhase = () => {
    stopTicker();
    handlePhaseComplete(true);
  };

  const toggleSound = () => setState(prev => ({ ...prev, sound: !prev.sound }));

  const toggleTimerRef = useRef(toggleTimer);
  toggleTimerRef.current = toggleTimer;

  return { toggleTimer, resetTimer, skipPhase, toggleSound, syncTimer, stopTicker, syncTimerRef, toggleTimerRef };
}
