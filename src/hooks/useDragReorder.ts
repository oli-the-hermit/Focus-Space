import React, { useState } from 'react';
import { isDragLeavingElement } from '../lib/dnd';

/** Props a draggable item needs; spread onto the item's root element. */
export interface DragItemProps {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/**
 * Drag-to-reorder state for a list of items with ids. `itemProps(id)` wires an item;
 * `isDragging`/`isDragOver` drive the `.dragging` / `.drag-over` classes (components/drag.css).
 */
export function useDragReorder(onReorder: (sourceId: string, targetId: string) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reset = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const itemProps = (id: string): DragItemProps => ({
    draggable: true,
    onDragStart: e => {
      // Only the item itself starts a reorder; dragging selected text out of a field inside it doesn't.
      if (e.target !== e.currentTarget) return;
      setDraggedId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    },
    onDragOver: e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== id) setDragOverId(id);
    },
    onDragLeave: e => {
      if (isDragLeavingElement(e)) setDragOverId(null);
    },
    onDrop: e => {
      e.preventDefault();
      if (draggedId && draggedId !== id) onReorder(draggedId, id);
      reset();
    },
    onDragEnd: reset
  });

  return {
    itemProps,
    isDragging: (id: string) => draggedId === id,
    isDragOver: (id: string) => dragOverId === id && draggedId !== id
  };
}
