import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SessionItem } from './SessionItem';
import { Session } from '../../types';
import { strings } from '../../constants/strings';

export const SessionsList: React.FC = () => {
  const {
    state,
    setActiveSession,
    openModal,
    duplicateSession,
    deleteSession,
    reorderSessions
  } = useApp();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      reorderSessions(draggedId, targetId);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddSession = () => {
    openModal('NEW_SESSION');
  };

  const handleEditSession = (session: Session) => {
    openModal('EDIT_SESSION', { session });
  };

  const handleDeleteSession = (session: Session) => {
    openModal('CONFIRM_DELETE', {
      title: strings.sessions.deleteConfirmTitle,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', session.name),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteSession(session.id)
    });
  };

  return (
    <div className="card panel-card">
      <div className="panel-card-header">
        <span className="panel-card-title">{strings.timer.sessionsTitle}</span>
        <button className="btn-action" id="addSessionBtn" onClick={handleAddSession}>
          {strings.timer.newSessionBtn}
        </button>
      </div>

      <div className="sessions-list" id="sessionsList">
        {state.sessions.length === 0 ? (
          <div className="empty-state small">{strings.sessions.emptySessionsMsg}</div>
        ) : (
          state.sessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === state.activeSessionId}
              onSelect={setActiveSession}
              onEdit={handleEditSession}
              onDuplicate={duplicateSession}
              onDelete={handleDeleteSession}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              isDragging={draggedId === session.id}
              isDragOver={dragOverId === session.id && draggedId !== session.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
