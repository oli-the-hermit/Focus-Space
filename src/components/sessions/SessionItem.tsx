import React from 'react';
import { Session } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash, IconGrip } from '../ui/icons';

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
}

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
  isDragOver
}) => {
  const { state } = useApp();
  const reward = session.rewardId ? state.rewards.find(r => r.id === session.rewardId) : null;

  return (
    <div
      className={`session-item draggable-item ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable={true}
      data-id={session.id}
      onDragStart={e => onDragStart(e, session.id)}
      onDragOver={e => onDragOver(e, session.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, session.id)}
      onClick={() => onSelect(session.id)}
    >
      <IconGrip title={strings.common.dragToReorder} />
      <div className="session-item-dot" />
      <div className="session-info">
        <div className="session-name">{session.name}</div>
        <div className="session-meta">
          {session.focusMinutes}' {strings.timer.focusPhase.toLowerCase()} · {session.breakMinutes}' {strings.timer.breakPhase.toLowerCase()}
          {reward ? ` · 🎁 ${reward.name}` : ''}
        </div>
      </div>
      <div className="session-actions">
        <button
          className="icon-btn xs"
          onClick={e => {
            e.stopPropagation();
            onEdit(session);
          }}
          title={strings.common.edit}
        >
          <IconEdit size={13} />
        </button>
        <button
          className="icon-btn xs"
          onClick={e => {
            e.stopPropagation();
            onDuplicate(session.id);
          }}
          title={strings.common.duplicate}
        >
          <IconCopy size={13} />
        </button>
        <button
          className="icon-btn xs danger"
          onClick={e => {
            e.stopPropagation();
            onDelete(session);
          }}
          title={strings.common.delete}
        >
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
};
