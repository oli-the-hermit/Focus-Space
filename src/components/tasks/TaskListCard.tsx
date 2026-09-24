import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskListBody } from './TaskListBody';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash } from '../ui/icons';

export interface TaskListCardProps {
  /** Defaults to the list selected in the Tasks sidebar. */
  listId?: string | null;
}

/** The main panel of the Tasks tab. The timer page uses SessionTaskLists instead. */
export const TaskListCard: React.FC<TaskListCardProps> = ({ listId }) => {
  const { state, duplicateList, deleteList, openModal } = useApp();

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

  return (
    <div className="card tasks-content">
      <div className="card-header">
        <div className="card-header-main">
          <h2 className="card-title" title={activeList?.name}>
            {activeList ? activeList.name : strings.tasks.selectListPrompt}
          </h2>
          {activeList && (
            <div className="card-subtitle-row">
              <span className="chip chip--accent">
                {strings.tasks.tasksRemaining.replace('{count}', String(remainingCount))}
              </span>
              {usedBy.map(s => (
                <span key={s.id} className="chip" title={s.name}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {activeList && (
          <div className="card-header-actions">
            <button
              className="icon-btn"
              onClick={() => openModal('RENAME_LIST', { list: activeList })}
              title={strings.tasks.renameTooltip}
              aria-label={strings.tasks.renameTooltip}
            >
              <IconEdit size={16} />
            </button>
            <button
              className="icon-btn"
              onClick={() => duplicateList(activeList.id)}
              title={strings.tasks.duplicateTooltip}
              aria-label={strings.tasks.duplicateTooltip}
            >
              <IconCopy size={16} />
            </button>
            <button
              className="icon-btn danger"
              onClick={handleDeleteList}
              title={strings.tasks.deleteTooltip}
              aria-label={strings.tasks.deleteTooltip}
            >
              <IconTrash size={16} />
            </button>
          </div>
        )}
      </div>

      {activeList ? (
        <TaskListBody list={activeList} />
      ) : (
        <div className="empty-state">{strings.tasks.emptyListPrompt}</div>
      )}
    </div>
  );
};
