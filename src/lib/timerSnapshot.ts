import { AppState, Session, TimerPhase, TimerStatus } from '../types';
import { nextPhase, phaseMinutes } from './sessionTime';

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
  /** A few unfinished tasks after the current one (large mini-player layout). */
  upNextTasks: string[];
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

/** Unfinished tasks across the session's lists, skipping the current one. */
export function getUpNextTasks(state: AppState, session: Session | undefined, limit = 3): string[] {
  if (!session) return [];
  const open: string[] = [];
  for (const listId of session.taskListIds || []) {
    const list = state.taskLists.find(l => l.id === listId);
    for (const t of list?.tasks || []) if (!t.completed) open.push(t.text);
  }
  return open.slice(1, 1 + limit);
}

/** Falls back to the session's configured length when the timer has no total yet. */
export function getPhaseTimes(state: AppState, session: Session | undefined): { total: number; remaining: number } {
  const defaultMins = phaseMinutes(session, state.timer.phase);
  const total = state.timer.total > 0 ? state.timer.total : defaultMins * 60;
  const remaining = state.timer.remaining >= 0 ? state.timer.remaining : total;
  return { total, remaining };
}

export function buildTimerSnapshot(state: AppState, noSessionLabel: string): TimerSnapshot {
  const session = getActiveSession(state);
  const { total, remaining } = getPhaseTimes(state, session);
  const nextMins = phaseMinutes(session, nextPhase(state.timer.phase));
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  return {
    phase: state.timer.phase,
    status: state.timer.status,
    remaining,
    total,
    targetEndTime: state.timer.status === 'running' ? state.timer.endsAt : null,
    sessionName: session?.name || noSessionLabel,
    currentTask: getCurrentTask(state, session),
    nextPhaseSeconds: nextMins * 60,
    completedToday: state.timer.sessionsCompletedToday,
    upNextTasks: getUpNextTasks(state, session),
    sound: state.sound,
    theme
  };
}
