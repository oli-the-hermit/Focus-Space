import { describe, expect, it } from 'vitest';
import { getCurrentTask, getSessionLists, getSessionTasks } from './timerSnapshot';
import type { AppState, Session, TaskList } from '../types';

const lists: TaskList[] = [
  { id: 'a', name: 'A', tasks: [
    { id: 't1', text: 'Done one', completed: true, durationSeconds: 90 },
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
      { listId: 'a', taskId: 't1', text: 'Done one', done: true, durationSeconds: 90 },
      { listId: 'a', taskId: 't2', text: 'Open one', done: false, durationSeconds: null },
      { listId: 'b', taskId: 't3', text: 'Other list', done: false, durationSeconds: null }
    ]);
  });

  it('is empty without a session or lists', () => {
    expect(getSessionTasks(state, undefined)).toEqual([]);
    expect(getSessionTasks(state, { ...session, taskListIds: ['gone'] })).toEqual([]);
  });

  it("names the session's existing lists in order", () => {
    expect(getSessionLists(state, { ...session, taskListIds: ['b', 'gone', 'a'] })).toEqual([
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' }
    ]);
    expect(getSessionLists(state, undefined)).toEqual([]);
  });

  it('keeps the current task as the first open one', () => {
    expect(getCurrentTask(state, session)).toBe('Open one');
  });
});
