import React, { useRef } from 'react';
import { cx } from '../../lib/cx';
import { useFlip, useNewIds } from '../../hooks/useListMotion';
import { Card, PanelHeader } from './Card';
import { EmptyState } from './EmptyState';

export interface QueuePanelProps {
  title: React.ReactNode;
  /** Usually a small tonal "New …" button. */
  action?: React.ReactNode;
  /** The items' ids, in order: new ones animate in and reorders glide. */
  ids: string[];
  emptyMessage: string;
  /** id of the list element. */
  listId?: string;
  className?: string;
  'data-tour'?: string;
  /** Renders the rows; isNew(id) is true for a row just added. */
  children: (isNew: (id: string) => boolean) => React.ReactNode;
}

/** A side panel holding a queue of QueueItems: header, action, the list or an empty state (styles: components/queue.css). */
export const QueuePanel: React.FC<QueuePanelProps> = ({ title, action, ids, emptyMessage, listId, className, 'data-tour': dataTour, children }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const newIds = useNewIds(ids);
  useFlip(listRef, ids);
  return (
    <Card className={cx('queue-panel', className)} data-tour={dataTour}>
      <PanelHeader title={title} action={action} />
      <div className="queue-list" id={listId} ref={listRef}>
        {ids.length === 0 ? <EmptyState size="sm">{emptyMessage}</EmptyState> : children(id => newIds.has(id))}
      </div>
    </Card>
  );
};
