/**
 * Arrow-key movement for a radio group laid out in rows (swatch grid, segmented control).
 * Returns the index to move to and select, or null when the key isn't a navigation key.
 * Moves past either end stay put (return the current index).
 */
export function radioKeyTarget(key: string, index: number, count: number, columns: number): number | null {
  const last = count - 1;
  const target =
    key === 'ArrowRight' ? index + 1
    : key === 'ArrowLeft' ? index - 1
    : key === 'ArrowDown' ? index + columns
    : key === 'ArrowUp' ? index - columns
    : key === 'Home' ? 0
    : key === 'End' ? last
    : null;
  if (target === null) return null;
  return target < 0 || target > last ? index : target;
}
