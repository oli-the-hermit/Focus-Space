import { describe, expect, it } from 'vitest';
import { getCurrentTask, getSessionTasks } from './timerSnapshot';
import type { AppState, Session, TaskList } from '../types';

const lists: TaskList[] = [
  { id: 'a', name: 'A', tasks: [
    { id: 't1', text: 'Done one', completed: true },
    { id: 't2', text: 'Open one', completed: false }
  ] },
  { id: 'b', name: 'B', tasks: [{ id: 't3', text: 'Other list', completed: false }] },
  { id: 'c', name: 'Not attached', tasks: [{ id: 't4', text: 'Hidden', completed: false }] }
];
const state = { taskLists: lists } as unknown as AppState;
const session = { id: 's', name: 'S', focusMinutes: 25, breakMinutes: 5, taskListIds: ['a', 'b'] } as Session;

describe('getSessionTasks', () => {
  it("lists every task of the session's lists, done ones too, in the app's order", () => {
    expect(getSessionTasks(state, session)).toEqual([
      { listId: 'a', taskId: 't1', text: 'Done one', done: true },
      { listId: 'a', taskId: 't2', text: 'Open one', done: false },
      { listId: 'b', taskId: 't3', text: 'Other list', done: false }
    ]);
  });

  it('is empty without a session or lists', () => {
    expect(getSessionTasks(state, undefined)).toEqual([]);
    expect(getSessionTasks(state, { ...session, taskListIds: ['gone'] })).toEqual([]);
  });

  it('keeps the current task as the first open one', () => {
    expect(getCurrentTask(state, session)).toBe('Open one');
  });
});
