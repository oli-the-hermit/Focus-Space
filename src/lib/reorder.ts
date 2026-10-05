/**
 * Moves the item with `sourceId` to where `targetId` is (drag-to-reorder).
 * Returns null when nothing moves: same id, or either id missing.
 */
export function moveById<T extends { id: string }>(items: readonly T[], sourceId: string, targetId: string): T[] | null {
  if (sourceId === targetId) return null;
  const from = items.findIndex(i => i.id === sourceId);
  const to = items.findIndex(i => i.id === targetId);
  if (from === -1 || to === -1) return null;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
