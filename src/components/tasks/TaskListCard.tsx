import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskListBody } from './TaskListBody';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconPlus, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { IconButton } from '../ui/IconButton';
import { Card, CardHeader } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';

export interface TaskListCardProps {
  /** Defaults to the list selected in the Tasks sidebar. */
  listId?: string | null;
}

/** The main panel of the Tasks tab. The timer page uses SessionTaskLists instead. */
export const TaskListCard: React.FC<TaskListCardProps> = ({ listId }) => {
  const { state, duplicateList, deleteList, openModal } = useApp();
  const contextMenu = useContextMenu();

  const targetListId = listId !== undefined ? listId : state.activeListId;
  const activeList = state.taskLists.find(l => l.id === targetListId);
  const remainingCount = activeList ? activeList.tasks.filter(t => !t.completed).length : 0;

  // Sessions that load this list on the timer page.
  const usedBy = activeList
    ? state.sessions.filter(s => s.taskListIds?.includes(activeList.id))
    : [];

  const handleDeleteList = () => {
    if (!activeList) return;
    openModal('CONFIRM_DELETE', {
      title: strings.tasks.deleteTooltip,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', activeList.name),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteList(activeList.id)
    });
  };

  const openListMenu = (e: React.MouseEvent) => {
    if (!activeList) return;
    contextMenu(e, [
      { key: 'new-task', label: strings.contextMenu.newTask, icon: <IconPlus size={15} />, onSelect: () => openModal('NEW_TASK', { listId: activeList.id }) },
      { key: 'rename', label: strings.tasks.renameTooltip, icon: <IconEdit size={15} />, onSelect: () => openModal('RENAME_LIST', { list: activeList }) },
      { key: 'dup', label: strings.tasks.duplicateTooltip, icon: <IconCopy size={15} />, onSelect: () => duplicateList(activeList.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.tasks.deleteTooltip, icon: <IconTrash size={15} />, danger: true, onSelect: handleDeleteList }
    ]);
  };

  return (
    <Card className="tasks-content">
      <CardHeader
        onContextMenu={openListMenu}
        title={activeList ? activeList.name : strings.tasks.selectListPrompt}
        titleTooltip={activeList?.name}
        subtitle={activeList && (
          <>
            <Chip tone="accent">
              {strings.tasks.tasksRemaining.replace('{count}', String(remainingCount))}
            </Chip>
            {usedBy.map(s => (
              <Chip key={s.id} title={s.name}>
                {s.name}
              </Chip>
            ))}
          </>
        )}
        actions={activeList && (
          <>
            <IconButton label={strings.tasks.renameTooltip} onClick={() => openModal('RENAME_LIST', { list: activeList })}>
              <IconEdit size={16} />
            </IconButton>
            <IconButton label={strings.tasks.duplicateTooltip} onClick={() => duplicateList(activeList.id)}>
              <IconCopy size={16} />
            </IconButton>
            <IconButton label={strings.tasks.deleteTooltip} tone="danger" onClick={handleDeleteList}>
              <IconTrash size={16} />
            </IconButton>
          </>
        )}
      />

      {activeList ? (
        <TaskListBody list={activeList} />
      ) : (
        <EmptyState>{strings.tasks.emptyListPrompt}</EmptyState>
      )}
    </Card>
  );
};
