/** Lowercase and without accents, for comparing names ("Diseño" matches "diseno"). */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

const SUBSEQUENCE_MIN = 3;

/** How well one query word sits in the text: lower is better, null when it isn't there. */
function wordScore(text: string, word: string): number | null {
  const at = text.indexOf(word);
  if (at === 0) return 0;
  if (at > 0) return /[\s\-_./]/.test(text[at - 1]) ? 1 : 2;
  // Letters in order ("prjtsk" in "project tasks"), only for words long enough to mean it.
  if (word.length < SUBSEQUENCE_MIN) return null;
  let i = 0;
  for (const ch of text) if (ch === word[i]) i++;
  return i === word.length ? 3 : null;
}

/**
 * A loose match of `query` against a name: every query word must appear (in any order, accents
 * and case ignored), as part of the text or, for longer words, as its letters in order.
 * Returns a score (lower is a better match: the text's start, then a word's start, then
 * inside a word, then letters in order) or null when it doesn't match. An empty query matches.
 */
export function matchScore(text: string, query: string): number | null {
  const words = normalizeName(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const t = normalizeName(text);
  let total = 0;
  for (const w of words) {
    const s = wordScore(t, w);
    if (s === null) return null;
    total += s;
  }
  return total;
}

/** The items whose name matches, best matches first (ties keep their order). */
export function rankByMatch<T>(items: readonly T[], query: string, nameOf: (item: T) => string): T[] {
  return items
    .map((item, i) => ({ item, i, score: matchScore(nameOf(item), query) }))
    .filter((x): x is { item: T; i: number; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map(x => x.item);
}
