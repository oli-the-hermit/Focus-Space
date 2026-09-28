import React from 'react';
import { Session } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash, IconGrip, IconGift, IconList, IconEqualizer } from '../ui/icons';
import { IconButton } from '../ui/IconButton';

export interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (id: string) => void;
  onDelete: (session: Session) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  /** Just created: plays the enter animation. */
  isNew?: boolean;
  onContextMenu?: (e: React.MouseEvent, session: Session) => void;
}

/**
 * Queue card. The name owns the whole first row (ellipsis at the right edge);
 * actions sit on the meta row and only show on hover/focus so they never crop it.
 */
export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver,
  isNew,
  onContextMenu
}) => {
  const { state } = useApp();
  const reward = session.rewardId ? state.rewards.find(r => r.id === session.rewardId) : null;
  const listCount = (session.taskListIds || []).filter(id => state.taskLists.some(l => l.id === id)).length;
  const isPlaying = isActive && state.timer.status === 'running';

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className={`session-item draggable-item ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isNew ? 'item-enter' : ''}`}
      onContextMenu={onContextMenu ? e => onContextMenu(e, session) : undefined}
      draggable={true}
      data-id={session.id}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onDragStart={e => onDragStart(e, session.id)}
      onDragOver={e => onDragOver(e, session.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, session.id)}
      onClick={() => onSelect(session.id)}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect(session.id);
        }
      }}
    >
      <IconGrip title={strings.common.dragToReorder} className="drag-handle session-grip" />

      <div className="session-name-row">
        {isActive && <IconEqualizer playing={isPlaying} />}
        <span className="session-name" title={session.name}>{session.name}</span>
      </div>

      <div className="session-meta-row">
        <div className="session-meta">
          <span className="session-meta-item">
            {session.focusMinutes}′ {strings.timer.focusPhase.toLowerCase()} · {session.breakMinutes}′ {strings.timer.breakPhase.toLowerCase()}
          </span>
          {listCount > 0 && (
            <span className="session-meta-item" title={`${listCount} ${strings.modals.taskListsLabel.toLowerCase()}`}>
              <IconList size={13} /> {listCount}
            </span>
          )}
          {reward && (
            <span className="session-meta-item" title={reward.name}>
              <IconGift size={13} />
            </span>
          )}
        </div>

        <div className="session-actions">
          <IconButton label={strings.common.edit} size="xs" onClick={stop(() => onEdit(session))}>
            <IconEdit size={14} />
          </IconButton>
          <IconButton
            label={strings.common.duplicate}
            size="xs"
            onClick={stop(() => onDuplicate(session.id))}
          >
            <IconCopy size={14} />
          </IconButton>
          <IconButton
            label={strings.common.delete}
            size="xs"
            tone="danger"
            onClick={stop(() => onDelete(session))}
          >
            <IconTrash size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
};
