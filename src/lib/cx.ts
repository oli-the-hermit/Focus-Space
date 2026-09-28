/** Joins class names, skipping empty and falsy parts: cx('a', cond && 'b') → 'a b'. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
