import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskListPanel } from './TaskListPanel';
import { Select } from '../ui/Select';
import { strings } from '../../constants/strings';
import { IconList, IconPlus } from '../ui/icons';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Chip } from '../ui/Chip';
import { format, plural } from '../../lib/i18n';

/**
 * Timer page center column: every task list attached to the active session,
 * plus a picker to attach (or create) another one.
 */
export const SessionTaskLists: React.FC = () => {
  const { state, setSessionTaskLists, createList } = useApp();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const session = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
  const attachedIds = (session?.taskListIds || []).filter(id => state.taskLists.some(l => l.id === id));
  const lists = attachedIds.map(id => state.taskLists.find(l => l.id === id)!);
  const available = state.taskLists.filter(l => !attachedIds.includes(l.id));
  const remaining = lists.reduce((sum, l) => sum + l.tasks.filter(t => !t.completed).length, 0);

  if (!session) {
    return (
      <Card className="session-tasks">
        <EmptyState>{strings.timer.noSession}</EmptyState>
      </Card>
    );
  }

  const save = (ids: string[]) => setSessionTaskLists(session.id, ids);

  const attach = (listId: string) => save([...attachedIds, listId]);

  const swap = (index: number, newId: string) => {
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

  const pickerOptions = available.map(l => ({
    value: l.id,
    label: l.name,
    meta: format(strings.tasks.tasksLeft, { count: l.tasks.filter(t => !t.completed).length })
  }));

  return (
    <Card className="session-tasks">
      <CardHeader
        overline={strings.timer.sessionTasksTitle}
        title={session.name}
        titleTooltip={session.name}
        aside={lists.length > 0 && (
          <Chip tone="accent">
            {plural(remaining, strings.tasks.tasksRemaining)}
          </Chip>
        )}
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
