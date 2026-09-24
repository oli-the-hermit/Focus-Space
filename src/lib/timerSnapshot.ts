import { AppState, Session, TimerPhase, TimerStatus } from '../types';

/** Everything the player / mini player needs to render, detached from app state. */
export interface TimerSnapshot {
  phase: TimerPhase;
  status: TimerStatus;
  remaining: number;
  total: number;
  /** Epoch ms when the running phase ends; null unless running. */
  targetEndTime: number | null;
  sessionName: string;
  currentTask: string | null;
  /** Length of the phase that follows the current one, in seconds. */
  nextPhaseSeconds: number;
  completedToday: number;
  sound: boolean;
  theme: 'light' | 'dark';
}

export function getActiveSession(state: AppState): Session | undefined {
  return state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
}

/** First unfinished task across the session's lists, in list order. */
export function getCurrentTask(state: AppState, session: Session | undefined): string | null {
  if (!session) return null;
  for (const listId of session.taskListIds || []) {
    const list = state.taskLists.find(l => l.id === listId);
    const task = list?.tasks.find(t => !t.completed);
    if (task) return task.text;
  }
  return null;
}

/** Falls back to the session's configured length when the timer has no total yet. */
export function getPhaseTimes(state: AppState, session: Session | undefined): { total: number; remaining: number } {
  const defaultMins = state.timer.phase === 'focus' ? (session?.focusMinutes || 25) : (session?.breakMinutes || 5);
  const total = state.timer.total > 0 ? state.timer.total : defaultMins * 60;
  const remaining = state.timer.remaining >= 0 ? state.timer.remaining : total;
  return { total, remaining };
}

export function buildTimerSnapshot(state: AppState, targetEndTime: number | null, noSessionLabel: string): TimerSnapshot {
  const session = getActiveSession(state);
  const { total, remaining } = getPhaseTimes(state, session);
  const nextMins = state.timer.phase === 'focus' ? (session?.breakMinutes || 5) : (session?.focusMinutes || 25);
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  return {
    phase: state.timer.phase,
    status: state.timer.status,
    remaining,
    total,
    targetEndTime: state.timer.status === 'running' ? targetEndTime : null,
    sessionName: session?.name || noSessionLabel,
    currentTask: getCurrentTask(state, session),
    nextPhaseSeconds: nextMins * 60,
    completedToday: state.timer.sessionsCompletedToday,
    sound: state.sound,
    theme
  };
}
