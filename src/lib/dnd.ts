import type React from 'react';

/**
 * True when a dragleave really leaves the element. Moving onto one of its
 * children also fires dragleave, which made the drop highlight flicker.
 */
export function isDragLeavingElement(e: React.DragEvent): boolean {
  const next = e.relatedTarget as Node | null;
  return !next || !(e.currentTarget as Node).contains(next);
}
