import { describe, expect, it } from 'vitest';
import { format, plural, weekdayNames } from './i18n';

describe('format', () => {
  it('fills every placeholder, numbers included', () => {
    expect(format('{done} of {total} completed', { done: 2, total: 5 })).toBe('2 of 5 completed');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(format('Hi {name}, {other}', { name: 'Ada' })).toBe('Hi Ada, {other}');
  });
});

describe('plural', () => {
  const forms = { one: '{count} day left', other: '{count} days left' };
  it('picks the singular for one', () => expect(plural(1, forms)).toBe('1 day left'));
  it('picks the plural otherwise', () => {
    expect(plural(0, forms)).toBe('0 days left');
    expect(plural(3, forms)).toBe('3 days left');
  });
});

describe('weekdayNames', () => {
  it('starts on Monday by default', () => {
    expect(weekdayNames('short')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
  it('can start on Sunday (JS getDay order)', () => {
    expect(weekdayNames('short', 'sunday')[0]).toBe('Sun');
  });
});
