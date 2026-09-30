/**
 * The accent presets ("Space colors"). Each is an OKLCH target; the generator
 * (npm run accents) fits it into sRGB, derives every accent token for both themes,
 * checks contrast and writes accentPalette.json, which the app reads at runtime.
 * Solar Lime is the brand color: its tokens are copied from tokens.css as they are.
 * Names live in strings.appearance.colors.
 */

export const ACCENT_GROUPS = ['vibrant', 'calm', 'muted'] as const;
export type AccentGroup = (typeof ACCENT_GROUPS)[number];

export interface AccentPreset {
  id: string;
  group: AccentGroup;
  /** OKLCH lightness, chroma and hue; chroma is reduced if sRGB can't show it. */
  l: number;
  c: number;
  h: number;
}

export const ACCENT_PRESETS = [
  // Vibrant: as saturated as each hue allows; darker hues stay dark enough to hold their color.
  { id: 'solar-lime', group: 'vibrant', l: 0.86, c: 0.19, h: 112 },
  { id: 'starlight-gold', group: 'vibrant', l: 0.85, c: 0.17, h: 92 },
  { id: 'sunflare', group: 'vibrant', l: 0.82, c: 0.17, h: 72 },
  { id: 'corona-orange', group: 'vibrant', l: 0.76, c: 0.17, h: 52 },
  { id: 'red-giant', group: 'vibrant', l: 0.68, c: 0.2, h: 28 },
  { id: 'pulsar-pink', group: 'vibrant', l: 0.74, c: 0.17, h: 358 },
  { id: 'nebula-magenta', group: 'vibrant', l: 0.7, c: 0.22, h: 335 },
  { id: 'nebula-purple', group: 'vibrant', l: 0.68, c: 0.2, h: 312 },
  { id: 'andromeda-violet', group: 'vibrant', l: 0.68, c: 0.18, h: 292 },
  { id: 'stardust-lavender', group: 'vibrant', l: 0.78, c: 0.13, h: 290 },
  { id: 'moonlight-blue', group: 'vibrant', l: 0.68, c: 0.16, h: 262 },
  { id: 'neptune-azure', group: 'vibrant', l: 0.74, c: 0.14, h: 242 },
  { id: 'comet-cyan', group: 'vibrant', l: 0.82, c: 0.13, h: 215 },
  { id: 'aurora-teal', group: 'vibrant', l: 0.8, c: 0.14, h: 185 },
  { id: 'aurora-green', group: 'vibrant', l: 0.8, c: 0.19, h: 148 },
  { id: 'supernova-mint', group: 'vibrant', l: 0.87, c: 0.15, h: 165 },
  // Calm: pastel, low chroma.
  { id: 'sage', group: 'calm', l: 0.82, c: 0.06, h: 135 },
  { id: 'mint', group: 'calm', l: 0.85, c: 0.07, h: 165 },
  { id: 'aquamarine', group: 'calm', l: 0.84, c: 0.07, h: 192 },
  { id: 'sky', group: 'calm', l: 0.83, c: 0.07, h: 235 },
  { id: 'periwinkle', group: 'calm', l: 0.8, c: 0.08, h: 275 },
  { id: 'lavender', group: 'calm', l: 0.82, c: 0.07, h: 310 },
  { id: 'blush', group: 'calm', l: 0.83, c: 0.07, h: 10 },
  { id: 'peach', group: 'calm', l: 0.85, c: 0.07, h: 55 },
  // Muted: nearly grey.
  { id: 'concrete', group: 'muted', l: 0.8, c: 0.004, h: 100 },
  { id: 'stone', group: 'muted', l: 0.78, c: 0.018, h: 75 },
  { id: 'taupe', group: 'muted', l: 0.74, c: 0.028, h: 55 },
  { id: 'clay', group: 'muted', l: 0.72, c: 0.04, h: 40 },
  { id: 'moss-grey', group: 'muted', l: 0.76, c: 0.03, h: 125 },
  { id: 'fog', group: 'muted', l: 0.86, c: 0.01, h: 230 },
  { id: 'pewter', group: 'muted', l: 0.76, c: 0.016, h: 220 },
  { id: 'slate', group: 'muted', l: 0.72, c: 0.03, h: 255 }
] as const satisfies readonly AccentPreset[];

export type AccentId = (typeof ACCENT_PRESETS)[number]['id'];

export const DEFAULT_ACCENT: AccentId = 'solar-lime';

/** How many picked accents Appearance > Recent colors keeps (per device). */
export const RECENT_ACCENTS_MAX = 5;

/** The break color paired with teal-like accents, so focus and break never look alike. */
export const CORAL_BREAK = { l: 0.74, c: 0.13, h: 32 } as const;

/** The custom properties a preset sets, in the order accentPalette.json lists their values. */
export const ACCENT_TOKENS = [
  '--accent',
  '--accent-hover',
  '--on-accent',
  '--on-accent-2',
  '--accent-container',
  '--on-accent-container',
  '--accent-text',
  '--focus-ring',
  '--break',
  '--break-hover',
  '--on-break',
  '--on-break-2',
  '--break-container',
  '--on-break-container'
] as const;

export const isAccentId = (v: unknown): v is AccentId => ACCENT_PRESETS.some(p => p.id === v);
