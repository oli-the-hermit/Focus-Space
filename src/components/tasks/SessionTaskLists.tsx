import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskListPanel } from './TaskListPanel';
import { Select } from '../ui/Select';
import { strings } from '../../constants/strings';
import { IconList } from '../ui/icons';

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
      <div className="card session-tasks">
        <div className="empty-state">{strings.timer.noSession}</div>
      </div>
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
    meta: strings.tasks.tasksLeft.replace('{count}', String(l.tasks.filter(t => !t.completed).length))
  }));

  return (
    <div className="card session-tasks">
      <div className="card-header">
        <div className="card-header-main">
          <span className="overline">{strings.timer.sessionTasksTitle}</span>
          <h2 className="card-title" title={session.name}>{session.name}</h2>
        </div>
        {lists.length > 0 && (
          <span className="chip chip--accent">
            {strings.tasks.tasksRemaining.replace('{count}', String(remaining))}
          </span>
        )}
      </div>

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
            className="select--add"
            value=""
            onChange={val => val && attach(val)}
            placeholder={`+ ${strings.timer.addAnotherList}`}
            ariaLabel={strings.timer.addAnotherList}
            options={pickerOptions}
            createOption={{
              label: strings.modals.newTaskListOption,
              placeholder: strings.modals.newTaskListPlaceholder,
              onCreate: createAndAttach
            }}
          />
        </div>
      )}
    </div>
  );
};
