import { describe, expect, it } from 'vitest';
import { nextPhase, phaseMinutes } from './sessionTime';
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

describe('nextPhase', () => {
  it('alternates', () => {
    expect(nextPhase('focus')).toBe('break');
    expect(nextPhase('break')).toBe('focus');
  });
});
