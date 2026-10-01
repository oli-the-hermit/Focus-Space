import { describe, expect, it } from 'vitest';
import raw from 'emojibase-data/en/compact.json';
import { EMOJI_CATEGORIES, buildCatalog, sameEmoji, searchEmoji } from './emoji';
import { hasFlagEmoji } from './platform';

const catalog = buildCatalog(raw as unknown as Parameters<typeof buildCatalog>[0]);

describe('emoji catalog', () => {
  it('fills every category and leaves out skin-tone swatches', () => {
    for (const c of EMOJI_CATEGORIES) expect(catalog.byCategory[c].length).toBeGreaterThan(0);
    expect(catalog.all.some(e => e.label.startsWith('regional indicator'))).toBe(false);
    expect(catalog.all.some(e => /skin tone$/.test(e.label))).toBe(false);
  });

  it('keeps emojibase order inside a category', () => {
    expect(catalog.byCategory.smileys[0].label).toBe('grinning face');
  });
});

describe('searchEmoji', () => {
  it('finds by tag: "coffee" gives the hot beverage', () => {
    const hits = searchEmoji(catalog.all, 'coffee');
    expect(hits.some(e => sameEmoji(e.char, '☕'))).toBe(true);
  });

  it('ranks names that start with the query first', () => {
    expect(searchEmoji(catalog.all, 'pizza')[0].label).toBe('pizza');
  });

  it('needs every word to match, and can leave out a category', () => {
    expect(searchEmoji(catalog.all, 'red heart')[0].label).toBe('red heart');
    expect(searchEmoji(catalog.all, 'flag', e => e.category === 'flags').every(e => e.category !== 'flags')).toBe(true);
    expect(searchEmoji(catalog.all, '   ')).toEqual([]);
  });
});

describe('emoji helpers', () => {
  it('treats the emoji variation selector as the same emoji', () => {
    expect(sameEmoji('☕️', '☕')).toBe(true);
    expect(sameEmoji('☕', '🍵')).toBe(false);
  });

  it('hides flags on Windows only', () => {
    expect(hasFlagEmoji('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(hasFlagEmoji('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe(true);
  });
});
