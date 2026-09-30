import { describe, expect, it } from 'vitest';
import css from '../styles/foundation/tokens.css?raw';
import palette from '../constants/accentPalette.json';
import { ACCENT_PRESETS, ACCENT_TOKENS, DEFAULT_ACCENT } from '../constants/accents';
import { auditPalette, buildPalette, parseTokens, phasesDistinct, type Palette } from './accentPalette';
import { contrast, hexToOklch, oklchToHex } from './color';

describe('color math', () => {
  it('round-trips hex through OKLCH', () => {
    for (const hex of ['#D1DD23', '#5EC8B8', '#0E0F11', '#FFFFFF', '#B3261E']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it('measures WCAG contrast', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('fits out-of-gamut colors by lowering chroma', () => {
    expect(oklchToHex({ l: 0.7, c: 0.5, h: 250 })).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('accent palette', () => {
  it('is up to date with the presets and tokens.css (run npm run accents)', () => {
    expect(palette).toEqual(buildPalette(css));
  });

  it('has an entry per preset with every token in both themes', () => {
    const p = palette as Palette;
    expect(Object.keys(p)).toEqual(ACCENT_PRESETS.map(x => x.id));
    for (const entry of Object.values(p)) {
      expect(entry.dark).toHaveLength(ACCENT_TOKENS.length);
      expect(entry.light).toHaveLength(ACCENT_TOKENS.length);
    }
  });

  it('meets every contrast rule in both themes', () => {
    expect(auditPalette(palette as Palette, css)).toEqual([]);
  });

  it('keeps Solar Lime and the teal break exactly as tokens.css defines them', () => {
    const tokens = parseTokens(css);
    const lime = (palette as Palette)[DEFAULT_ACCENT];
    ACCENT_TOKENS.forEach((name, i) => {
      expect(lime.dark[i]).toBe(tokens.dark[name].toUpperCase());
      expect(lime.light[i]).toBe(tokens.light[name].toUpperCase());
    });
  });

  it('tells focus and break apart', () => {
    expect(phasesDistinct('#D1DD23', '#5EC8B8')).toBe(true);
    expect(phasesDistinct('#0BDAC9', '#5EC8B8')).toBe(false);
    expect(phasesDistinct('#BEBEBB', '#5EC8B8')).toBe(true);
  });
});
