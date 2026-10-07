import React from 'react';
import { cx } from '../../lib/cx';
import type { DragItemProps } from '../../hooks/useDragReorder';
import { IconGrip } from './icons';
import { IconButton } from './IconButton';

export interface QueueAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export interface QueueItemProps {
  id: string;
  title: string;
  active: boolean;
  onSelect: () => void;
  /** Before the name, e.g. a "now playing" mark. */
  leading?: React.ReactNode;
  /** After the name, e.g. a count. */
  trailing?: React.ReactNode;
  /** A second row of details; the actions sit on it. Without it they float over the row's end. */
  meta?: React.ReactNode;
  /** Shown on hover and focus. */
  actions: QueueAction[];
  /** Tooltip of the drag grip. */
  dragLabel: string;
  drag?: DragItemProps;
  isDragging?: boolean;
  isDragOver?: boolean;
  /** Just created: plays the enter animation. */
  isNew?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * A selectable, reorderable row in a queue (sessions, task lists): the name owns the first
 * row; the tools appear on hover so they never crop it (styles: components/queue.css).
 * Pattern: a row that selects on click shows the pointer, and its grip the grab cursor.
 */
export const QueueItem: React.FC<QueueItemProps> = ({
  id,
  title,
  active,
  onSelect,
  leading,
  trailing,
  meta,
  actions,
  dragLabel,
  drag,
  isDragging,
  isDragOver,
  isNew,
  onContextMenu
}) => {
  // The tools sit on the accent fill when the row is active, else on the raised row.
  const surface = active ? ('accent' as const) : 3;
  const tools = (
    <div className={cx('queue-item-actions', !meta && 'is-floating')}>
      {actions.map(a => (
        <IconButton
          key={a.key}
          label={a.label}
          size="xs"
          surface={surface}
          tone={a.danger ? 'danger' : 'default'}
          onClick={e => {
            e.stopPropagation();
            a.onClick();
          }}
        >
          {a.icon}
        </IconButton>
      ))}
    </div>
  );

  return (
    <div
      className={cx(
        'queue-item draggable-item',
        !meta && 'queue-item--single',
        active && 'active',
        isDragging && 'dragging',
        isDragOver && 'drag-over',
        isNew && 'item-enter'
      )}
      data-id={id}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onContextMenu={onContextMenu}
      onClick={onSelect}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect();
        }
      }}
      {...drag}
    >
      <IconGrip title={dragLabel} className="drag-handle queue-item-grip" />

      <div className="queue-item-name-row">
        {leading}
        <span className="queue-item-name" title={title}>{title}</span>
        {trailing && <span className="queue-item-trailing">{trailing}</span>}
        {!meta && tools}
      </div>

      {meta && (
        <div className="queue-item-meta-row">
          <div className="queue-item-meta">{meta}</div>
          {tools}
        </div>
      )}
    </div>
  );
};
