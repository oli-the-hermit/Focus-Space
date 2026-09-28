import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { TaskListBody } from './TaskListBody';
import { Select } from '../ui/Select';
import { Menu, MenuItem } from '../ui/Menu';
import { useContextMenu } from '../ui/ContextMenu';
import { strings } from '../../constants/strings';
import { IconChevronDown, IconCopy, IconEdit, IconPlus, IconTrash, IconUnlink } from '../ui/icons';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';

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
  const contextMenu = useContextMenu();

  const handleDelete = () => {
    openModal('CONFIRM_DELETE', {
      title: strings.tasks.deleteTooltip,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', list.name),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteList(list.id)
    });
  };

  // Shared by the overflow menu and a right-click on the header.
  const menuItems: MenuItem[] = [
    {
      key: 'new-task',
      label: strings.contextMenu.newTask,
      icon: <IconPlus size={15} />,
      onSelect: () => openModal('NEW_TASK', { listId: list.id })
    },
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
    { key: 'd1', divider: true },
    {
      key: 'delete',
      label: strings.tasks.deleteTooltip,
      icon: <IconTrash size={15} />,
      danger: true,
      onSelect: handleDelete
    }
  ];

  return (
    <section className={`list-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <header className="list-panel-header" onContextMenu={e => contextMenu(e, menuItems)}>
        <IconButton
          label={collapsed ? strings.timer.expandList : strings.timer.collapseList}
          size="sm"
          className="list-panel-collapse"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          <IconChevronDown size={18} />
        </IconButton>

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

        <Chip tone="accent" className="list-panel-count">
          {strings.tasks.tasksLeft.replace('{count}', String(remaining))}
        </Chip>

        <Menu ariaLabel={strings.timer.moreListActions} items={menuItems} />
      </header>

      {!collapsed && <TaskListBody list={list} />}
    </section>
  );
};
