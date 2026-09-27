import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration } from './formatUtils';

describe('formatDuration', () => {
  it('handles empty and negative input', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-5)).toBe('0s');
  });

  it('formats seconds, whole minutes and mixed values', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(120)).toBe('2m');
    expect(formatDuration(135)).toBe('2m 15s');
  });
});

describe('formatClock', () => {
  it('pads minutes and seconds', () => {
    expect(formatClock(75)).toBe('01:15');
    expect(formatClock(0)).toBe('00:00');
  });

  it('adds hours only when needed', () => {
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('clamps invalid input to zero', () => {
    expect(formatClock(-10)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });
});
