import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SessionItem } from './SessionItem';
import { Session } from '../../types';
import { strings } from '../../constants/strings';
import { IconCalendar, IconCopy, IconEdit, IconPlay, IconPlus, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { useFlip, useNewIds } from '../../hooks/useListMotion';
import { getTodayStr } from '../../lib/dateUtils';
import { isDragLeavingElement } from '../../lib/dnd';
import { Button } from '../ui/Button';
import { Card, PanelHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

export const SessionsList: React.FC = () => {
  const {
    state,
    setActiveSession,
    openModal,
    duplicateSession,
    deleteSession,
    reorderSessions,
    toggleTimer
  } = useApp();
  const contextMenu = useContextMenu();
  const listRef = useRef<HTMLDivElement>(null);
  const ids = state.sessions.map(s => s.id);
  const newIds = useNewIds(ids);
  useFlip(listRef, ids);

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

  const handleDragLeave = (e: React.DragEvent) => {
    if (isDragLeavingElement(e)) setDragOverId(null);
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

  const startSession = (session: Session) => {
    setActiveSession(session.id);
    // setActiveSession resets the timer to idle; start it on the next tick.
    setTimeout(toggleTimer, 0);
  };

  const openSessionMenu = (e: React.MouseEvent, session: Session) => {
    const cm = strings.contextMenu;
    contextMenu(e, [
      { key: 'start', label: cm.startSession, icon: <IconPlay size={15} />, onSelect: () => startSession(session) },
      { key: 'edit', label: strings.common.edit, icon: <IconEdit size={15} />, onSelect: () => handleEditSession(session) },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => duplicateSession(session.id) },
      {
        key: 'schedule',
        label: cm.scheduleSession,
        icon: <IconCalendar size={16} />,
        onSelect: () => openModal('SCHEDULE_EVENT', { date: getTodayStr() })
      },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: () => handleDeleteSession(session) }
    ]);
  };

  return (
    <Card className="sessions-panel">
      <PanelHeader
        title={strings.timer.sessionsTitle}
        action={
          <Button variant="tonal" size="sm" id="addSessionBtn" icon={<IconPlus size={15} strokeWidth={2.4} />} onClick={handleAddSession}>
            {strings.timer.newSessionBtn.replace('+ ', '')}
          </Button>
        }
      />

      <div className="sessions-list" id="sessionsList" ref={listRef}>
        {state.sessions.length === 0 ? (
          <EmptyState size="sm">{strings.sessions.emptySessionsMsg}</EmptyState>
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
              isNew={newIds.has(session.id)}
              onContextMenu={openSessionMenu}
            />
          ))
        )}
      </div>
    </Card>
  );
};
