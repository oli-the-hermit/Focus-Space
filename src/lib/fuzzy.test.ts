import { describe, expect, it } from 'vitest';
import { matchScore, normalizeName, rankByMatch } from './fuzzy';

describe('loose name matching', () => {
  it('ignores case and accents', () => {
    expect(normalizeName('  Diseño GRÁFICO ')).toBe('diseno grafico');
    expect(matchScore('Diseño gráfico', 'diseno')).not.toBeNull();
  });

  it('finds words in any order, at a word start or inside one', () => {
    expect(matchScore('Branding ADHD', 'brand')).toBe(0);
    expect(matchScore('Branding ADHD', 'adhd brand')).toBe(1);
    expect(matchScore('Rebranding', 'brand')).toBe(2);
  });

  it('accepts letters in order for longer words only', () => {
    expect(matchScore('Project tasks', 'prjtsk')).toBe(3);
    expect(matchScore('Project tasks', 'pt')).toBeNull();
    expect(matchScore('Project tasks', 'kst')).toBeNull();
  });

  it('needs every word to match', () => {
    expect(matchScore('Branding ADHD', 'brand video')).toBeNull();
    expect(matchScore('Anything', '   ')).toBe(0);
  });

  it('ranks the best matches first and keeps ties in order', () => {
    const names = ['Rebranding', 'Backlog', 'Brand colors', 'Branding ADHD'];
    expect(rankByMatch(names, 'brand', n => n)).toEqual(['Brand colors', 'Branding ADHD', 'Rebranding']);
    expect(rankByMatch(names, '', n => n)).toEqual(names);
  });
});
