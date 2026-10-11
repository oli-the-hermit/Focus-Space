import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskListPanel } from './TaskListPanel';
import { Select } from '../ui/Select';
import { strings } from '../../constants/strings';
import { IconEdit, IconExpand, IconList, IconPlus, IconTasks } from '../ui/icons';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Chip } from '../ui/Chip';
import { Menu, tidyMenuItems } from '../ui/Menu';
import { format, plural } from '../../lib/i18n';
import { moveById } from '../../lib/reorder';
import { useDragReorder } from '../../hooks/useDragReorder';
import { pushRecentList, recentLists } from '../../lib/recentLists';

/**
 * Timer page center column: the active session (its name under a "Session" overline) and
 * every task list attached to it, reorderable, plus a picker to attach (or create) another.
 */
export const SessionTaskLists: React.FC = () => {
  const { state, setSessionTaskLists, createList, openModal, setActiveList, setActiveTab } = useApp();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const session = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
  const attachedIds = (session?.taskListIds || []).filter(id => state.taskLists.some(l => l.id === id));
  const lists = attachedIds.map(id => state.taskLists.find(l => l.id === id)!);
  const available = state.taskLists.filter(l => !attachedIds.includes(l.id));
  const remaining = lists.reduce((sum, l) => sum + l.tasks.filter(t => !t.completed).length, 0);
  const drag = useDragReorder((sourceId, targetId) => {
    const next = moveById(attachedIds.map(id => ({ id })), sourceId, targetId);
    if (next && session) setSessionTaskLists(session.id, next.map(x => x.id));
  });

  if (!session) {
    return (
      <Card className="session-tasks">
        <EmptyState>{strings.timer.noSession}</EmptyState>
      </Card>
    );
  }

  const save = (ids: string[]) => setSessionTaskLists(session.id, ids);

  const attach = (listId: string) => {
    pushRecentList(listId);
    save([...attachedIds, listId]);
  };

  const swap = (index: number, newId: string) => {
    pushRecentList(newId);
    const next = [...attachedIds];
    next[index] = newId;
    save(next);
  };

  const detach = (listId: string) => save(attachedIds.filter(id => id !== listId));

  const toggleCollapsed = (listId: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });

  const createAndAttach = (name: string) => {
    attach(createList(name, { activate: false }));
  };

  const allCollapsed = lists.length > 0 && lists.every(l => collapsed.has(l.id));
  const sessionMenuItems = tidyMenuItems([
    lists.length > 0 && {
      key: 'collapse',
      label: allCollapsed ? strings.timer.expandAll : strings.timer.collapseAll,
      icon: <IconExpand size={15} />,
      onSelect: () => setCollapsed(allCollapsed ? new Set() : new Set(attachedIds))
    },
    lists.length > 0 && {
      key: 'open',
      label: strings.timer.openInTasks,
      icon: <IconTasks size={15} />,
      onSelect: () => {
        setActiveList(lists[0].id);
        setActiveTab('tasks');
      }
    },
    { key: 'edit', label: strings.actions.editSession, icon: <IconEdit size={15} />, onSelect: () => openModal('EDIT_SESSION', { session }) }
  ]);

  const pickerOptions = available.map(l => ({
    value: l.id,
    label: l.name,
    meta: format(strings.tasks.tasksLeft, { count: l.tasks.filter(t => !t.completed).length })
  }));

  return (
    <Card className="session-tasks">
      <CardHeader
        overline={strings.timer.sessionOverline}
        title={session.name}
        titleTooltip={session.name}
        titleAddon={lists.length > 0 && (
          <Chip tone="accent">
            {plural(remaining, strings.tasks.tasksRemaining)}
          </Chip>
        )}
        actions={<Menu ariaLabel={strings.timer.moreSessionActions} items={sessionMenuItems} />}
      />

      {lists.length === 0 ? (
        <div className="session-tasks-empty">
          <span className="session-tasks-empty-icon"><IconList size={22} /></span>
          <p className="session-tasks-empty-title">{strings.timer.noSessionListsTitle}</p>
          <p className="session-tasks-empty-hint">{strings.timer.noSessionListsHint}</p>
          <Select
            value=""
            onChange={val => val && attach(val)}
            placeholder={strings.timer.pickListPlaceholder}
            ariaLabel={strings.timer.pickListPlaceholder}
            options={pickerOptions}
            recent={{ values: recentLists(), label: strings.timer.recentLists }}
            createOption={{
              label: strings.modals.newTaskListOption,
              placeholder: strings.modals.newTaskListPlaceholder,
              onCreate: createAndAttach
            }}
          />
        </div>
      ) : (
        <div className="list-panel-stack">
          {lists.map((list, index) => (
            <TaskListPanel
              key={list.id}
              list={list}
              attachedIds={attachedIds}
              collapsed={collapsed.has(list.id)}
              onToggleCollapsed={() => toggleCollapsed(list.id)}
              onSwap={newId => swap(index, newId)}
              onDetach={() => detach(list.id)}
              drag={drag.itemProps(list.id)}
              isDragging={drag.isDragging(list.id)}
              isDragOver={drag.isDragOver(list.id)}
            />
          ))}

          <Select
            variant="add"
            value=""
            onChange={val => val && attach(val)}
            ariaLabel={strings.timer.addAnotherList}
            icon={<IconPlus size={16} strokeWidth={2.4} />}
            placeholder={strings.timer.addAnotherList}
            options={pickerOptions}
            recent={{ values: recentLists(), label: strings.timer.recentLists }}
            createOption={{
              label: strings.modals.newTaskListOption,
              placeholder: strings.modals.newTaskListPlaceholder,
              onCreate: createAndAttach
            }}
          />
        </div>
      )}
    </Card>
  );
};
