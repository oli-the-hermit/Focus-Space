import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskListPanel } from './TaskListPanel';
import { strings } from '../../constants/strings';
import { IconEdit, IconExpand, IconList, IconPlus, IconTasks } from '../ui/icons';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Chip } from '../ui/Chip';
import { Menu, tidyMenuItems } from '../ui/Menu';
import { ListPicker, ListPickerTrigger, type ListPickerItem, type ListPickerSort } from '../ui/ListPicker';
import { format, plural } from '../../lib/i18n';
import { moveById } from '../../lib/reorder';
import { normalizeName } from '../../lib/fuzzy';
import { useDragReorder } from '../../hooks/useDragReorder';
import { pushRecentList, recentLists } from '../../lib/recentLists';
import type { TaskList } from '../../types';

const openCount = (l: TaskList) => l.tasks.filter(t => !t.completed).length;

/**
 * Timer page center column: the active session (its name under a "Session" overline) and
 * every task list attached to it, reorderable, plus a list picker to attach (or create)
 * another, also opened from the session's ⋮.
 */
export const SessionTaskLists: React.FC = () => {
  const { state, setSessionTaskLists, createList, openModal, setActiveList, setActiveTab } = useApp();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnchor = useRef<HTMLButtonElement>(null);

  const session = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
  const attachedIds = (session?.taskListIds || []).filter(id => state.taskLists.some(l => l.id === id));
  const lists = attachedIds.map(id => state.taskLists.find(l => l.id === id)!);
  const available = state.taskLists.filter(l => !attachedIds.includes(l.id));
  const remaining = lists.reduce((sum, l) => sum + openCount(l), 0);
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
    { key: 'add', label: strings.timer.addTaskList, icon: <IconPlus size={15} />, onSelect: () => setPickerOpen(true) },
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

  // The picker: lists not in the session yet, with their size and what's left.
  const byId = new Map(available.map(l => [l.id, l]));
  const pickerItems: ListPickerItem[] = available.map(l => ({
    id: l.id,
    label: l.name,
    meta: format(strings.timer.listMeta, {
      total: plural(l.tasks.length, strings.tasks.taskCount),
      left: format(strings.tasks.tasksLeft, { count: openCount(l) })
    })
  }));
  const sorts: ListPickerSort[] = [
    { key: 'order', label: strings.timer.sortOrder },
    { key: 'az', label: strings.timer.sortNameAsc, compare: (a, b) => a.label.localeCompare(b.label) },
    { key: 'za', label: strings.timer.sortNameDesc, compare: (a, b) => b.label.localeCompare(a.label) },
    { key: 'left', label: strings.timer.sortMostLeft, compare: (a, b) => openCount(byId.get(b.id)!) - openCount(byId.get(a.id)!) }
  ];
  // With no lists at all: the session's name and a few starters (names already taken left out).
  const taken = new Set(state.taskLists.map(l => normalizeName(l.name)));
  const suggestedNames = [session.name, ...Object.values(strings.timer.listNameStarters)]
    .filter((name, i, all) => !taken.has(normalizeName(name)) && all.findIndex(n => normalizeName(n) === normalizeName(name)) === i);

  const picker = (
    <ListPicker
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      anchorRef={pickerAnchor}
      title={strings.timer.addListTitle}
      items={pickerItems}
      icon={<IconList size={18} />}
      onPick={attach}
      recent={{ ids: recentLists(), label: strings.timer.recentLists }}
      sorts={sorts}
      newLabel={strings.modals.newTaskListOption}
      createLabel={name => format(strings.timer.createListNamed, { name })}
      onCreate={createAndAttach}
      namePlaceholder={strings.modals.newTaskListPlaceholder}
      suggestions={{ names: suggestedNames, label: strings.timer.suggestedNames }}
    />
  );

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
          <ListPickerTrigger
            ref={pickerAnchor}
            look="field"
            label={strings.timer.pickListPlaceholder}
            open={pickerOpen}
            onClick={() => setPickerOpen(o => !o)}
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

          <ListPickerTrigger
            ref={pickerAnchor}
            look="add"
            icon={<IconPlus size={16} strokeWidth={2.4} />}
            label={strings.timer.addAnotherList}
            open={pickerOpen}
            onClick={() => setPickerOpen(o => !o)}
          />
        </div>
      )}

      {picker}
    </Card>
  );
};
