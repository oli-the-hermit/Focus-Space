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
  /** Every task of the session's lists, in list order (large mini-player layout). */
  tasks: SnapshotTask[];
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

/** A task as the mini player shows it; the ids let it tick the task off. */
export interface SnapshotTask {
  listId: string;
  taskId: string;
  text: string;
  done: boolean;
}

/** Every task across the session's lists, done or not, in the same order as the app. */
export function getSessionTasks(state: AppState, session: Session | undefined): SnapshotTask[] {
  if (!session) return [];
  const tasks: SnapshotTask[] = [];
  for (const listId of session.taskListIds || []) {
    const list = state.taskLists.find(l => l.id === listId);
    for (const t of list?.tasks || []) tasks.push({ listId, taskId: t.id, text: t.text, done: t.completed });
  }
  return tasks;
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
    tasks: getSessionTasks(state, session),
    sound: state.sound,
    theme
  };
}
