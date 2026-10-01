/**
 * The emoji catalog for the emoji picker: emojibase-data (MIT), loaded on first use
 * into its own chunk so the app doesn't carry it until someone opens the picker.
 */

export const EMOJI_CATEGORIES = ['smileys', 'animals', 'food', 'activities', 'travel', 'objects', 'symbols', 'flags'] as const;
export type EmojiCategory = (typeof EMOJI_CATEGORIES)[number];

export interface Emoji {
  char: string;
  /** Its name, e.g. "hot beverage": the tooltip and accessible name. */
  label: string;
  category: EmojiCategory;
  /** Name and tags, lowercased, for search. */
  terms: string[];
}

export interface EmojiCatalog {
  byCategory: Record<EmojiCategory, Emoji[]>;
  all: Emoji[];
}

/** The fields used from emojibase's compact format. */
interface RawEmoji {
  unicode: string;
  label: string;
  group?: number;
  order?: number;
  tags?: string[];
}

/** emojibase groups → picker categories; group 2 (skin-tone swatches) is left out. */
const GROUPS: Record<number, EmojiCategory> = {
  0: 'smileys',
  1: 'smileys',
  3: 'animals',
  4: 'food',
  5: 'travel',
  6: 'activities',
  7: 'objects',
  8: 'symbols',
  9: 'flags'
};

export function buildCatalog(raw: RawEmoji[]): EmojiCatalog {
  const byCategory = Object.fromEntries(EMOJI_CATEGORIES.map(c => [c, [] as Emoji[]])) as Record<EmojiCategory, Emoji[]>;
  const sorted = raw
    .filter(e => e.group !== undefined && GROUPS[e.group])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const e of sorted) {
    const category = GROUPS[e.group!];
    byCategory[category].push({
      char: e.unicode,
      label: e.label,
      category,
      terms: [e.label.toLowerCase(), ...(e.tags ?? []).map(t => t.toLowerCase())]
    });
  }
  return { byCategory, all: EMOJI_CATEGORIES.flatMap(c => byCategory[c]) };
}

let catalog: Promise<EmojiCatalog> | null = null;

/** The catalog, fetched once per session. */
export function loadEmojiCatalog(): Promise<EmojiCatalog> {
  catalog ??= import('emojibase-data/en/compact.json').then(m => buildCatalog(m.default as unknown as RawEmoji[]));
  return catalog;
}

/**
 * Emoji whose name or tags match every word of the query: names that start with it
 * first, then any word that starts with it, then anything containing it.
 */
export function searchEmoji(list: Emoji[], query: string, exclude: (e: Emoji) => boolean = () => false): Emoji[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  /** 0 name starts with it, 1 a word starts with it, 2 contains it, -1 no match. */
  const wordScore = (e: Emoji, w: string): number =>
    e.terms[0].startsWith(w) ? 0
    : e.terms.some(t => t.split(' ').some(p => p.startsWith(w))) ? 1
    : e.terms.some(t => t.includes(w)) ? 2
    : -1;
  const rank = (e: Emoji): number => {
    let total = 0;
    for (const w of words) {
      const s = wordScore(e, w);
      if (s < 0) return -1;
      total += s;
    }
    return total;
  };
  return list
    .filter(e => !exclude(e))
    .map(e => ({ e, r: rank(e) }))
    .filter(x => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map(x => x.e);
}

/** Two spellings of one emoji (with or without the emoji variation selector) count as the same. */
export const sameEmoji = (a: string, b: string): boolean => a.replace(/️/g, '') === b.replace(/️/g, '');
