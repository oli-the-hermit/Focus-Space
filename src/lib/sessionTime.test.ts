import { describe, expect, it } from 'vitest';
import { idleTimer, nextPhase, phaseMinutes, secondsUntil } from './sessionTime';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES } from '../constants/defaults';

describe('phaseMinutes', () => {
  it('reads the session', () => {
    expect(phaseMinutes({ focusMinutes: 50, breakMinutes: 10 }, 'focus')).toBe(50);
    expect(phaseMinutes({ focusMinutes: 50, breakMinutes: 10 }, 'break')).toBe(10);
  });

  it('falls back to the defaults', () => {
    expect(phaseMinutes(null, 'focus')).toBe(DEFAULT_FOCUS_MINUTES);
    expect(phaseMinutes({ focusMinutes: 0, breakMinutes: 0 }, 'break')).toBe(DEFAULT_BREAK_MINUTES);
  });
});

describe('idleTimer', () => {
  it('stops the timer at the start of a phase and keeps the day count', () => {
    const running = { phase: 'focus' as const, status: 'running' as const, remaining: 12, total: 1500, sessionsCompletedToday: 3, endsAt: 99 };
    expect(idleTimer(running, { focusMinutes: 50, breakMinutes: 10 }, 'break')).toEqual({
      phase: 'break', status: 'idle', remaining: 600, total: 600, sessionsCompletedToday: 3, endsAt: null
    });
  });
});

describe('secondsUntil', () => {
  it('rounds up and never goes negative', () => {
    expect(secondsUntil(10_001, 0)).toBe(11);
    expect(secondsUntil(10_000, 0)).toBe(10);
    expect(secondsUntil(0, 5000)).toBe(0);
  });
});

describe('nextPhase', () => {
  it('alternates', () => {
    expect(nextPhase('focus')).toBe('break');
    expect(nextPhase('break')).toBe('focus');
  });
});
