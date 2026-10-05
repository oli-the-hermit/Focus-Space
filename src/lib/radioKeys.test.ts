import { describe, expect, it } from 'vitest';
import { radioKeyTarget } from './radioKeys';

describe('radioKeyTarget', () => {
  it('moves along a row and between rows', () => {
    expect(radioKeyTarget('ArrowRight', 2, 16, 8)).toBe(3);
    expect(radioKeyTarget('ArrowLeft', 2, 16, 8)).toBe(1);
    expect(radioKeyTarget('ArrowDown', 2, 16, 8)).toBe(10);
    expect(radioKeyTarget('ArrowUp', 10, 16, 8)).toBe(2);
  });

  it('jumps to the ends', () => {
    expect(radioKeyTarget('Home', 5, 16, 8)).toBe(0);
    expect(radioKeyTarget('End', 5, 16, 8)).toBe(15);
  });

  it('stays put past either end', () => {
    expect(radioKeyTarget('ArrowLeft', 0, 3, 1)).toBe(0);
    expect(radioKeyTarget('ArrowDown', 2, 3, 1)).toBe(2);
    expect(radioKeyTarget('ArrowUp', 3, 16, 8)).toBe(3);
  });

  it('treats up and down as previous and next in a single row', () => {
    expect(radioKeyTarget('ArrowDown', 0, 3, 1)).toBe(1);
    expect(radioKeyTarget('ArrowUp', 1, 3, 1)).toBe(0);
  });

  it('ignores other keys', () => {
    expect(radioKeyTarget('Enter', 1, 3, 1)).toBeNull();
    expect(radioKeyTarget('a', 1, 3, 1)).toBeNull();
  });
});
