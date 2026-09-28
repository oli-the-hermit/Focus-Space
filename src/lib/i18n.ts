/**
 * Language helpers. Every user-facing word lives in constants/strings.ts; these
 * fill in its {placeholders}, pick plural forms and format dates in the app's
 * language, so no component builds text or picks a locale on its own.
 */

/** The UI language. Dates and plurals follow it, so they match the strings. */
export const LOCALE = 'en-US';

export type TemplateVars = Record<string, string | number>;

/** format('{count} left', { count: 3 }) → '3 left'. Unknown placeholders are left as they are. */
export function format(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export interface PluralForms {
  one: string;
  other: string;
}

const pluralRules = new Intl.PluralRules(LOCALE);

/** plural(2, { one: '{count} day left', other: '{count} days left' }) → '2 days left'. */
export function plural(count: number, forms: PluralForms, vars: TemplateVars = {}): string {
  const form = pluralRules.select(count) === 'one' ? forms.one : forms.other;
  return format(form, { count, ...vars });
}

/**
 * Weekday names starting on Monday (the app's week) or Sunday (JS getDay() order).
 * `short` → Mon, `long` → Monday, `narrow` → M.
 */
export function weekdayNames(style: 'short' | 'long' | 'narrow', start: 'monday' | 'sunday' = 'monday'): string[] {
  const fmt = new Intl.DateTimeFormat(LOCALE, { weekday: style });
  // 2024-01-01 was a Monday; 2023-12-31 a Sunday.
  const first = start === 'monday' ? 1 : 0;
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 11, 31 + first + i)));
}
