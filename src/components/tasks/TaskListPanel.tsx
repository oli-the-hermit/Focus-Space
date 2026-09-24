import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { TaskListBody } from './TaskListBody';
import { Select } from '../ui/Select';
import { Menu } from '../ui/Menu';
import { strings } from '../../constants/strings';
import { IconChevronDown, IconCopy, IconEdit, IconTrash, IconUnlink } from '../ui/icons';

export interface TaskListPanelProps {
  list: TaskList;
  /** Ids of every list attached to the session, to flag lists already in use. */
  attachedIds: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Put a different list in this panel's slot. */
  onSwap: (newListId: string) => void;
  onDetach: () => void;
}

/** One of the session's task lists on the timer page, headed by a list picker. */
export const TaskListPanel: React.FC<TaskListPanelProps> = ({
  list,
  attachedIds,
  collapsed,
  onToggleCollapsed,
  onSwap,
  onDetach
}) => {
  const { state, createList, duplicateList, deleteList, openModal } = useApp();
  const remaining = list.tasks.filter(t => !t.completed).length;

  const handleDelete = () => {
    openModal('CONFIRM_DELETE', {
      title: strings.tasks.deleteTooltip,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', list.name),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteList(list.id)
    });
  };

  return (
    <section className={`list-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <header className="list-panel-header">
        <button
          type="button"
          className="icon-btn sm list-panel-collapse"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? strings.timer.expandList : strings.timer.collapseList}
          title={collapsed ? strings.timer.expandList : strings.timer.collapseList}
        >
          <IconChevronDown size={18} />
        </button>

        <Select
          variant="header"
          value={list.id}
          onChange={val => val !== list.id && onSwap(val)}
          ariaLabel={strings.timer.pickListPlaceholder}
          options={state.taskLists.map(l => {
            const inUseElsewhere = l.id !== list.id && attachedIds.includes(l.id);
            return {
              value: l.id,
              label: l.name,
              meta: inUseElsewhere
                ? strings.timer.listInUse
                : strings.tasks.tasksLeft.replace('{count}', String(l.tasks.filter(t => !t.completed).length)),
              disabled: inUseElsewhere
            };
          })}
          createOption={{
            label: strings.modals.newTaskListOption,
            placeholder: strings.modals.newTaskListPlaceholder,
            onCreate: name => onSwap(createList(name, { activate: false }))
          }}
        />

        <span className="chip chip--accent list-panel-count">
          {strings.tasks.tasksLeft.replace('{count}', String(remaining))}
        </span>

        <Menu
          ariaLabel={strings.timer.moreListActions}
          items={[
            {
              key: 'rename',
              label: strings.tasks.renameTooltip,
              icon: <IconEdit size={15} />,
              onSelect: () => openModal('RENAME_LIST', { list })
            },
            {
              key: 'duplicate',
              label: strings.tasks.duplicateTooltip,
              icon: <IconCopy size={15} />,
              onSelect: () => duplicateList(list.id)
            },
            {
              key: 'detach',
              label: strings.modals.removeFromSession,
              icon: <IconUnlink size={15} />,
              onSelect: onDetach
            },
            {
              key: 'delete',
              label: strings.tasks.deleteTooltip,
              icon: <IconTrash size={15} />,
              danger: true,
              onSelect: handleDelete
            }
          ]}
        />
      </header>

      {!collapsed && <TaskListBody list={list} />}
    </section>
  );
};
