import React from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import { strings } from '../../constants/strings';
import { IconCalendar, IconCopy, IconEdit, IconEqualizer, IconGift, IconList, IconPlay, IconPlus, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { getTodayStr } from '../../lib/dateUtils';
import { Button } from '../ui/Button';
import { QueuePanel } from '../ui/QueuePanel';
import { QueueItem } from '../ui/QueueItem';
import { useDragReorder } from '../../hooks/useDragReorder';
import { format } from '../../lib/i18n';

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
  const drag = useDragReorder(reorderSessions);

  const handleEditSession = (session: Session) => {
    openModal('EDIT_SESSION', { session });
  };

  const handleDeleteSession = (session: Session) => {
    openModal('CONFIRM_DELETE', {
      title: strings.sessions.deleteConfirmTitle,
      message: format(strings.sessions.deleteConfirmPrompt, { name: session.name }),
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
    const cm = strings.actions;
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

  /** Focus and break lengths, attached lists and the reward, on the row under the name. */
  const sessionMeta = (session: Session) => {
    const reward = session.rewardId ? state.rewards.find(r => r.id === session.rewardId) : null;
    const listCount = (session.taskListIds || []).filter(id => state.taskLists.some(l => l.id === id)).length;
    return (
      <>
        <span className="queue-item-meta-item">
          {session.focusMinutes}′ {strings.timer.focusPhase.toLowerCase()} · {session.breakMinutes}′ {strings.timer.breakPhase.toLowerCase()}
        </span>
        {listCount > 0 && (
          <span className="queue-item-meta-item" title={`${listCount} ${strings.modals.taskListsLabel.toLowerCase()}`}>
            <IconList size={13} /> {listCount}
          </span>
        )}
        {reward && (
          <span className="queue-item-meta-item" title={reward.name}>
            <IconGift size={13} />
          </span>
        )}
      </>
    );
  };

  return (
    <QueuePanel
      title={strings.timer.sessionsTitle}
      action={
        <Button variant="tonal" size="sm" id="addSessionBtn" icon={<IconPlus size={15} strokeWidth={2.4} />} onClick={() => openModal('NEW_SESSION')}>
          {strings.actions.newSession}
        </Button>
      }
      ids={state.sessions.map(s => s.id)}
      emptyMessage={strings.sessions.emptySessionsMsg}
      listId="sessionsList"
    >
      {isNew =>
        state.sessions.map(session => {
          const isActive = session.id === state.activeSessionId;
          return (
            <QueueItem
              key={session.id}
              id={session.id}
              title={session.name}
              active={isActive}
              onSelect={() => setActiveSession(session.id)}
              leading={isActive ? <IconEqualizer playing={isActive && state.timer.status === 'running'} /> : undefined}
              meta={sessionMeta(session)}
              actions={[
                { key: 'edit', label: strings.common.edit, icon: <IconEdit size={14} />, onClick: () => handleEditSession(session) },
                { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={14} />, onClick: () => duplicateSession(session.id) },
                { key: 'delete', label: strings.common.delete, icon: <IconTrash size={14} />, danger: true, onClick: () => handleDeleteSession(session) }
              ]}
              dragLabel={strings.common.dragToReorder}
              drag={drag.itemProps(session.id)}
              isDragging={drag.isDragging(session.id)}
              isDragOver={drag.isDragOver(session.id)}
              isNew={isNew(session.id)}
              onContextMenu={e => openSessionMenu(e, session)}
            />
          );
        })
      }
    </QueuePanel>
  );
};
