/**
 * Builds and audits accentPalette.json from the presets and tokens.css. Build-time only:
 * the app reads the generated JSON and never ships this code. Imports carry .ts
 * extensions because scripts/accents/generate.ts runs this file under plain Node.
 */
import { ACCENT_PRESETS, ACCENT_TOKENS, CORAL_BREAK, DEFAULT_ACCENT, type AccentId } from '../constants/accents.ts';
import { contrast, deltaE, hexToOklch, hueDistance, oklchToHex, type Oklch } from './color.ts';

export type ThemeName = 'dark' | 'light';
export const THEME_NAMES: readonly ThemeName[] = ['dark', 'light'];

export interface PaletteEntry {
  break: 'teal' | 'coral';
  /** Values in ACCENT_TOKENS order. */
  dark: string[];
  light: string[];
}
export type Palette = Record<AccentId, PaletteEntry>;

/** Minimum contrast ratios (WCAG 2.2 AA): text 4.5, focus rings and UI parts 3. */
export const RULES = { text: 4.5, ui: 3 } as const;

/** Surfaces text and focus rings sit on. */
const SURFACES = ['--bg', '--surface-1', '--surface-2', '--surface-3'] as const;

/** Every custom property in tokens.css, merged per theme (light = dark overridden by the light blocks). */
export function parseTokens(css: string): Record<ThemeName, Record<string, string>> {
  const dark: Record<string, string> = {};
  const lightOnly: Record<string, string> = {};
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const block of clean.matchAll(/(:root|\[data-theme="light"\])\s*\{([^}]*)\}/g)) {
    const target = block[1] === ':root' ? dark : lightOnly;
    for (const decl of block[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) target[decl[1]] = decl[2].trim();
  }
  return { dark, light: { ...dark, ...lightOnly } };
}

const hex = (l: number, c: number, h: number) => oklchToHex({ l, c, h });
const minContrast = (fg: string, bgs: string[]) => Math.min(...bgs.map(bg => contrast(fg, bg)));

/** Walks lightness from `from` toward `to` until `ok` passes; null if it never does. */
function seek(from: number, to: number, c: number, h: number, ok: (x: string) => boolean): string | null {
  const step = from < to ? 0.005 : -0.005;
  for (let l = from; step > 0 ? l <= to + 1e-9 : l >= to - 1e-9; l += step) {
    const x = hex(l, c, h);
    if (ok(x)) return x;
  }
  return null;
}

function need(value: string | null, what: string): string {
  if (!value) throw new Error(`No color meets the contrast rule for ${what}`);
  return value;
}

/**
 * The eight accent roles of one base color in one theme: fill, hover, text on the
 * fill, secondary text on the fill, container, text on the container, accent as text,
 * and the focus ring. A break color uses all but the focus ring.
 */
export function deriveRoles(base: Oklch, theme: ThemeName, surfaces: string[], label: string): string[] {
  const fill = hex(base.l, base.c, base.h);
  const { l, c, h } = hexToOklch(fill);
  const dark = theme === 'dark';
  const hover = hex(l + (dark ? 0.035 : -0.035), c, h);

  const darkInk = hex(0.22, Math.min(c * 0.35, 0.05), h);
  const onFill = contrast(darkInk, fill) >= RULES.text ? darkInk : contrast('#FFFFFF', fill) >= RULES.text ? '#FFFFFF' : null;
  const on = need(onFill, `${label} text on the fill`);
  const readsOnFill = (x: string) => contrast(x, fill) >= RULES.text && contrast(x, hover) >= RULES.text;
  const on2 = on === '#FFFFFF'
    ? seek(0.9, 1, Math.min(c * 0.2, 0.04), h, readsOnFill) ?? on
    : need(seek(0.45, 0.2, Math.min(c * 0.8, 0.12), h, readsOnFill), `${label} secondary text on the fill`);

  const container = dark ? hex(0.32, Math.min(c * 0.4, 0.08), h) : hex(0.94, Math.min(c * 0.35, 0.08), h);
  const readsOnContainer = (x: string) => contrast(x, container) >= RULES.text;
  const onContainer = need(
    dark ? seek(0.92, 1, Math.min(c * 0.7, 0.14), h, readsOnContainer) : seek(0.38, 0, Math.min(c * 0.6, 0.11), h, readsOnContainer),
    `${label} text on the container`
  );

  const readsOnSurfaces = (x: string) => minContrast(x, surfaces) >= RULES.text;
  const text = need(dark ? seek(l, 1, c, h, readsOnSurfaces) : seek(Math.min(l, 0.62), 0, c, h, readsOnSurfaces), `${label} as text`);
  const ring = dark && minContrast(fill, surfaces) >= RULES.ui ? fill : text;

  return [fill, hover, on, on2, container, onContainer, text, ring];
}

/**
 * Focus and break must not look alike: when both are colorful their hues sit apart,
 * and overall they are far apart or one is clearly more colorful (a grey beside teal).
 */
export function phasesDistinct(a: string, b: string): boolean {
  const [x, y] = [hexToOklch(a), hexToOklch(b)];
  if (x.c >= 0.04 && y.c >= 0.04 && hueDistance(x.h, y.h) < 40) return false;
  return deltaE(a, b) >= 0.12 || Math.abs(x.c - y.c) >= 0.07;
}

const pick = (tokens: Record<string, string>, names: readonly string[]) => names.map(n => {
  const v = tokens[n];
  if (!v) throw new Error(`tokens.css has no ${n}`);
  return v.toUpperCase();
});

export function buildPalette(tokensCss: string): Palette {
  const tokens = parseTokens(tokensCss);
  const accentNames = ACCENT_TOKENS.slice(0, 8);
  const breakNames = ACCENT_TOKENS.slice(8);
  const teal = { dark: pick(tokens.dark, breakNames), light: pick(tokens.light, breakNames) };
  // A break has every role but the focus ring (the last one).
  const coral = Object.fromEntries(THEME_NAMES.map(t => [t, deriveRoles(CORAL_BREAK, t, pick(tokens[t], SURFACES), 'the coral break').slice(0, 7)])) as Record<ThemeName, string[]>;

  const palette = {} as Palette;
  for (const preset of ACCENT_PRESETS) {
    const accent = Object.fromEntries(THEME_NAMES.map(t => [
      t,
      preset.id === DEFAULT_ACCENT ? pick(tokens[t], accentNames) : deriveRoles(preset, t, pick(tokens[t], SURFACES), preset.id)
    ])) as Record<ThemeName, string[]>;
    const pair = phasesDistinct(accent.dark[0], teal.dark[0]) ? 'teal' : 'coral';
    const brk = pair === 'teal' ? teal : coral;
    palette[preset.id] = { break: pair, dark: [...accent.dark, ...brk.dark], light: [...accent.light, ...brk.light] };
  }
  return palette;
}

/** Every broken rule in the palette, as readable lines; empty when all pass. */
export function auditPalette(palette: Palette, tokensCss: string): string[] {
  const tokens = parseTokens(tokensCss);
  const problems: string[] = [];
  for (const [id, entry] of Object.entries(palette)) {
    for (const theme of THEME_NAMES) {
      const v = Object.fromEntries(ACCENT_TOKENS.map((name, i) => [name, entry[theme][i]]));
      const surfaces = pick(tokens[theme], SURFACES);
      const expect = (ratio: number, min: number, what: string) => {
        if (ratio < min) problems.push(`${id} (${theme}): ${what} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
      };
      for (const [prefix, fill] of [['accent', '--accent'], ['break', '--break']] as const) {
        const on = prefix === 'accent' ? '--on-accent' : '--on-break';
        expect(contrast(v[on], v[fill]), RULES.text, `${on} on ${fill}`);
        expect(contrast(v[on], v[`${fill}-hover`]), RULES.text, `${on} on ${fill}-hover`);
        expect(contrast(v[`${on}-2`], v[fill]), RULES.text, `${on}-2 on ${fill}`);
        expect(contrast(v[`--on-${prefix}-container`], v[`--${prefix}-container`]), RULES.text, `--on-${prefix}-container on its container`);
      }
      expect(minContrast(v['--accent-text'], surfaces), RULES.text, '--accent-text on the surfaces');
      expect(minContrast(v['--break-text'], surfaces), RULES.text, '--break-text on the surfaces');
      expect(minContrast(v['--focus-ring'], surfaces), RULES.ui, '--focus-ring on the surfaces');
      if (!phasesDistinct(v['--accent'], v['--break'])) problems.push(`${id} (${theme}): focus and break colors look alike`);
    }
  }
  return problems;
}
