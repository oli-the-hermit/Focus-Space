import React from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { TaskListBody } from './TaskListBody';
import { Select } from '../ui/Select';
import { Menu, MenuItem } from '../ui/Menu';
import { useContextMenu } from '../ui/ContextMenu';
import { strings } from '../../constants/strings';
import { IconChevronDown, IconCopy, IconEdit, IconGrip, IconPlus, IconTrash, IconUnlink } from '../ui/icons';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';
import { format } from '../../lib/i18n';
import { cx } from '../../lib/cx';
import type { DragItemProps } from '../../hooks/useDragReorder';
import { recentLists } from '../../lib/recentLists';

export interface TaskListPanelProps {
  list: TaskList;
  /** Ids of every list attached to the session, to flag lists already in use. */
  attachedIds: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Put a different list in this panel's slot. */
  onSwap: (newListId: string) => void;
  onDetach: () => void;
  /** Reorders the panel among the session's lists; the header is the handle. */
  drag?: DragItemProps;
  isDragging?: boolean;
  isDragOver?: boolean;
}

/**
 * One of the session's task lists on the timer page: the list picker (with its count) under a
 * "Task list" overline, then the collapse toggle and the list's ⋮ menu. The free part of the
 * header drags the panel; its grip shows at the panel's side while hovered or held.
 */
export const TaskListPanel: React.FC<TaskListPanelProps> = ({
  list,
  attachedIds,
  collapsed,
  onToggleCollapsed,
  onSwap,
  onDetach,
  drag,
  isDragging = false,
  isDragOver = false
}) => {
  const { state, createList, duplicateList, deleteList, openModal } = useApp();
  const remaining = list.tasks.filter(t => !t.completed).length;
  const contextMenu = useContextMenu();

  const handleDelete = () => {
    openModal('CONFIRM_DELETE', {
      title: strings.tasks.deleteTooltip,
      message: format(strings.sessions.deleteConfirmPrompt, { name: list.name }),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteList(list.id)
    });
  };

  // Shared by the overflow menu and a right-click on the header.
  const menuItems: MenuItem[] = [
    {
      key: 'new-task',
      label: strings.actions.newTask,
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

  // The panel takes the drop; only its header starts a drag, so dragging inside the list
  // (tasks, text) never moves the whole panel.
  const { draggable, onDragStart, onDragEnd, ...dropProps } = drag ?? {};

  return (
    <section
      className={cx('list-panel draggable-item', collapsed && 'is-collapsed', isDragging && 'dragging', isDragOver && 'drag-over')}
      {...dropProps}
    >
      {/* A container's grip: hidden until its header is hovered or the panel is held. */}
      <IconGrip title={strings.common.dragToReorder} className="drag-handle list-panel-grip" />
      <header
        className="list-panel-header drag-surface"
        onContextMenu={e => contextMenu(e, menuItems)}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="list-panel-title">
          <span className="overline">{strings.timer.listOverline}</span>
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
                  : format(strings.tasks.tasksLeft, { count: l.tasks.filter(t => !t.completed).length }),
                disabled: inUseElsewhere
              };
            })}
            createOption={{
              label: strings.modals.newTaskListOption,
              placeholder: strings.modals.newTaskListPlaceholder,
              onCreate: name => onSwap(createList(name, { activate: false }))
            }}
            recent={{ values: recentLists(), label: strings.timer.recentLists }}
            valueAddon={<Chip tone="accent">{format(strings.tasks.tasksLeft, { count: remaining })}</Chip>}
          />
        </div>

        <IconButton
          label={collapsed ? strings.timer.expandList : strings.timer.collapseList}
          surface={2}
          className="list-panel-collapse"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          <IconChevronDown size={18} />
        </IconButton>
        <Menu ariaLabel={strings.timer.moreListActions} items={menuItems} triggerSurface={2} />
      </header>

      {!collapsed && <TaskListBody list={list} />}
    </section>
  );
};
