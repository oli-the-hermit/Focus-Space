import React, { useState } from 'react';
import { Session } from '../../types';
import { useApp } from '../../context/AppContext';

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
      <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
      <div className="session-item-dot" />
      <div className="session-info">
        <div className="session-name">{session.name}</div>
        <div className="session-meta">
          {session.focusMinutes}' focus · {session.breakMinutes}' break
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
          title="Edit"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="icon-btn xs"
          onClick={e => {
            e.stopPropagation();
            onDuplicate(session.id);
          }}
          title="Duplicate"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          className="icon-btn xs danger"
          onClick={e => {
            e.stopPropagation();
            onDelete(session);
          }}
          title="Delete"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
