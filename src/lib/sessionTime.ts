import type { Session, TimerPhase } from '../types';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from '../constants/defaults';

/** Minutes a phase lasts in a session, falling back to the defaults when unset. */
export function phaseMinutes(session: Pick<Session, 'focusMinutes' | 'breakMinutes'> | null | undefined, phase: TimerPhase): number {
  return phase === 'focus'
    ? session?.focusMinutes || DEFAULT_FOCUS_MINUTES
    : session?.breakMinutes || DEFAULT_BREAK_MINUTES;
}

/** The other phase: focus → break → focus. */
export const nextPhase = (phase: TimerPhase): TimerPhase => (phase === 'focus' ? 'break' : 'focus');
