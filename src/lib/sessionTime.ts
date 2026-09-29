import type { Session, TimerPhase, TimerState } from '../types';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from '../constants/defaults';

/** Minutes a phase lasts in a session, falling back to the defaults when unset. */
export function phaseMinutes(session: Pick<Session, 'focusMinutes' | 'breakMinutes'> | null | undefined, phase: TimerPhase): number {
  return phase === 'focus'
    ? session?.focusMinutes || DEFAULT_FOCUS_MINUTES
    : session?.breakMinutes || DEFAULT_BREAK_MINUTES;
}

/** The other phase: focus → break → focus. */
export const nextPhase = (phase: TimerPhase): TimerPhase => (phase === 'focus' ? 'break' : 'focus');

/** The timer stopped at the start of `phase`, set to that phase's full length in `session`. */
export function idleTimer(
  timer: TimerState,
  session: Pick<Session, 'focusMinutes' | 'breakMinutes'> | null | undefined,
  phase: TimerPhase
): TimerState {
  const secs = phaseMinutes(session, phase) * 60;
  return { ...timer, phase, status: 'idle', remaining: secs, total: secs, endsAt: null };
}

/** Whole seconds left until `endsAt`, never negative. */
export const secondsUntil = (endsAt: number, now = Date.now()) => Math.max(0, Math.ceil((endsAt - now) / 1000));
