/** Task lists and the tasks inside them. */
import type { ActionDeps } from './types';
import { strings } from '../../constants/strings';
import { getTodayStr } from '../../lib/dateUtils';
import { formatDuration } from '../../lib/formatUtils';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { moveById } from '../../lib/reorder';
import { Task, TaskList } from '../../types';

export function createListActions({ setState, showToast, stateRef }: Pick<ActionDeps, 'setState' | 'showToast' | 'stateRef'>) {
  const reorderTaskLists = (sourceId: string, targetId: string) => {
    setState(prev => {
      const taskLists = moveById(prev.taskLists, sourceId, targetId);
      return taskLists ? { ...prev, taskLists } : prev;
    });
  };

  const reorderTasks = (listId: string, sourceId: string, targetId: string) => {
    setState(prev => {
      const targetList = prev.taskLists.find(l => l.id === listId);
      const newTasks = targetList && moveById(targetList.tasks, sourceId, targetId);
      if (!newTasks) return prev;
      return {
        ...prev,
        taskLists: prev.taskLists.map(l => (l.id === listId ? { ...l, tasks: newTasks } : l))
      };
    });
  };

  const setActiveList = (id: string) => setState(prev => ({ ...prev, activeListId: id }));

  const createList = (name: string, options: { activate?: boolean } = {}): string => {
    const { activate = true } = options;
    const newList: TaskList = { id: uid(), name, tasks: [] };
    setState(prev => ({
      ...prev,
      taskLists: [...prev.taskLists, newList],
      activeListId: activate ? newList.id : prev.activeListId,
      selectedListIdForTimer: prev.selectedListIdForTimer || newList.id
    }));
    showToast(format(strings.toasts.listCreated, { name }));
    return newList.id;
  };

  const renameList = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => (l.id === id ? { ...l, name } : l))
    }));
    showToast(strings.toasts.listRenamed);
  };

  const duplicateList = (id: string) => {
    setState(prev => {
      const target = prev.taskLists.find(l => l.id === id);
      if (!target) return prev;
      const dup: TaskList = {
        id: uid(),
        name: format(strings.common.copyOf, { name: target.name }),
        tasks: target.tasks.map(t => ({ ...t, id: uid(), completed: false, durationSeconds: null }))
      };
      return { ...prev, taskLists: [...prev.taskLists, dup], activeListId: dup.id };
    });
    showToast(strings.toasts.listDuplicated);
  };

  const deleteList = (id: string) => {
    setState(prev => {
      const filtered = prev.taskLists.filter(l => l.id !== id);
      return {
        ...prev,
        taskLists: filtered,
        sessions: prev.sessions.map(s =>
          s.taskListIds?.includes(id) ? { ...s, taskListIds: s.taskListIds.filter(x => x !== id) } : s
        ),
        activeListId: filtered[0]?.id || null,
        selectedListIdForTimer:
          prev.selectedListIdForTimer === id ? (filtered[0]?.id || null) : prev.selectedListIdForTimer
      };
    });
    showToast(strings.toasts.listDeleted);
  };

  const setSelectedListForTimer = (id: string | null) => setState(prev => ({ ...prev, selectedListIdForTimer: id }));

  const addTask = (listId: string, text: string) => {
    const newTask: Task = { id: uid(), text, completed: false, createdAt: Date.now() };
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => (l.id === listId ? { ...l, tasks: [...l.tasks, newTask] } : l))
    }));
  };

  const toggleTask = (listId: string, taskId: string, checked: boolean) => {
    const now = Date.now();
    // Decide from the latest state outside the updater: React may run updaters
    // twice (StrictMode), which used to show the "Task done" toast twice.
    const current = stateRef.current;
    const list = current.taskLists.find(l => l.id === listId);
    const task = list?.tasks.find(t => t.id === taskId);
    if (!list || !task) return;
    // Time since the previous check-off (or a minute, for the first one).
    const startTime = current.activeActivityStartTime || now - 60_000;
    const durationSeconds = checked ? Math.max(1, Math.round((now - startTime) / 1000)) : null;

    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l =>
        l.id !== listId
          ? l
          : {
              ...l,
              tasks: l.tasks.map(t => {
                if (t.id !== taskId) return t;
                return checked
                  ? { ...t, completed: true, completedAt: now, durationSeconds }
                  : { ...t, completed: false, completedAt: null, durationSeconds: null };
              })
            }
      ),
      taskCompletionLogs: checked && durationSeconds
        ? [
            ...prev.taskCompletionLogs,
            {
              id: uid(),
              taskId,
              taskText: task.text,
              durationSeconds,
              listId,
              listName: list.name || strings.tasks.untitledList,
              timestamp: now,
              date: getTodayStr()
            }
          ]
        : prev.taskCompletionLogs,
      activeActivityStartTime: checked ? now : prev.activeActivityStartTime
    }));

    if (checked && durationSeconds) {
      showToast(format(strings.toasts.taskDone, { duration: formatDuration(durationSeconds) }));
    }
  };

  const renameTask = (listId: string, taskId: string, newText: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l =>
        l.id === listId
          ? {
              ...l,
              tasks: l.tasks.map(t => (t.id === taskId ? { ...t, text: newText } : t))
            }
          : l
      )
    }));
    showToast(strings.toasts.taskUpdated);
  };

  const duplicateTask = (listId: string, taskId: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => {
        if (l.id !== listId) return l;
        const target = l.tasks.find(t => t.id === taskId);
        if (!target) return l;
        const copy: Task = { ...target, id: uid(), completed: false, durationSeconds: null };
        const idx = l.tasks.indexOf(target);
        const newTasks = [...l.tasks];
        newTasks.splice(idx + 1, 0, copy);
        return { ...l, tasks: newTasks };
      })
    }));
  };

  const deleteTask = (listId: string, taskId: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l =>
        l.id === listId
          ? {
              ...l,
              tasks: l.tasks.filter(t => t.id !== taskId)
            }
          : l
      )
    }));
  };

  return { reorderTaskLists, reorderTasks, setActiveList, createList, renameList, duplicateList, deleteList, setSelectedListForTimer, addTask, toggleTask, renameTask, duplicateTask, deleteTask };
}
