import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskItem } from './TaskItem';
import { Task } from '../../types';

export interface TaskListCardProps {
  listId?: string | null;
  inTimer?: boolean;
}

export const TaskListCard: React.FC<TaskListCardProps> = ({ listId, inTimer = false }) => {
  const {
    state,
    addTask,
    toggleTask,
    duplicateTask,
    deleteTask,
    duplicateList,
    deleteList,
    openModal,
    reorderTasks,
    setSelectedListForTimer
  } = useApp();

  const [newTaskText, setNewTaskText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];

  const targetListId = inTimer
    ? (listId !== undefined ? listId : state.selectedListIdForTimer)
    : (listId !== undefined ? listId : state.activeListId);

  const activeList = state.taskLists.find(l => l.id === targetListId);

  const remainingCount = activeList ? activeList.tasks.filter(t => !t.completed).length : 0;
  const total = activeList ? activeList.tasks.length : 0;
  const done = activeList ? activeList.tasks.filter(t => t.completed).length : 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  let titleText = '';
  if (inTimer) {
    titleText = activeList
      ? `${activeSession?.name || 'Session'} · ${activeList.name}`
      : (activeSession?.name || 'Focus Session');
  } else {
    titleText = activeList ? activeList.name : 'Select a List';
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, tId: string) => {
    e.preventDefault();
    if (activeList && draggedId && draggedId !== tId) {
      reorderTasks(activeList.id, draggedId, tId);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList || !newTaskText.trim()) return;
    addTask(activeList.id, newTaskText.trim());
    setNewTaskText('');
  };

  const handleRenameList = () => {
    if (activeList) {
      openModal('RENAME_LIST', { list: activeList });
    }
  };

  const handleDeleteList = () => {
    if (activeList) {
      openModal('CONFIRM_DELETE', {
        title: 'Delete Task List',
        message: `Delete "${activeList.name}"?`,
        confirmLabel: 'Delete List',
        onConfirm: () => deleteList(activeList.id)
      });
    }
  };

  const handleRenameTask = (lId: string, task: Task) => {
    openModal('RENAME_TASK', { listId: lId, task });
  };

  const handleDeleteTask = (lId: string, task: Task) => {
    openModal('CONFIRM_DELETE', {
      title: 'Delete Task',
      message: `Delete task "${task.text}"?`,
      confirmLabel: 'Delete Task',
      onConfirm: () => deleteTask(lId, task.id)
    });
  };

  return (
    <div className="card tasks-content">
      {/* Header */}
      <div className="tasks-content-header">
        <div className="tch-left">
          <div className="tch-title-wrap">
            <span className="tch-title" id="activeListName">
              {titleText}
            </span>
            <span className="timer-task-count-badge" id="taskRemainingPill">
              {remainingCount} remaining
            </span>
          </div>

          {activeList && (
            <div className="tch-actions" id="listActions">
              <button
                className="icon-btn xs"
                id="renameListBtn"
                onClick={handleRenameList}
                title="Rename list"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                className="icon-btn xs"
                id="duplicateListBtn"
                onClick={() => duplicateList(activeList.id)}
                title="Duplicate list"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button
                className="icon-btn xs danger"
                id="deleteListBtn"
                onClick={handleDeleteList}
                title="Delete list"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Task List Dropdown in Timer & Sessions */}
      {inTimer && (
        <div className="timer-list-select-wrapper" style={{ marginTop: '12px', marginBottom: '14px' }}>
          <select
            className="form-select"
            id="focusListSelect"
            value={state.selectedListIdForTimer || ''}
            onChange={e => setSelectedListForTimer(e.target.value || null)}
            style={{ width: '100%' }}
          >
            <option value="">— Select a Task List for this Session —</option>
            {state.taskLists.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.tasks.filter(t => !t.completed).length} tasks remaining)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Progress Bar */}
      {activeList && total > 0 && (
        <div className="tch-progress" id="listProgress" style={{ marginBottom: '14px' }}>
          <div className="progress-row">
            <span id="progressLabel">{done} of {total} completed</span>
            <span id="progressPct">{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" id="progressFill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Add Task Form */}
      {activeList && (
        <form className="add-task-form" id="addTaskForm" onSubmit={handleAddTask}>
          <input
            type="text"
            className="form-input"
            id="newTaskInput"
            placeholder="Add a task and press Enter…"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn-action primary">
            Add
          </button>
        </form>
      )}

      {/* Task List Items */}
      <div className="task-list-items" id="taskItems">
        {!activeList ? (
          <div className="empty-state small">
            {inTimer
              ? 'Select a task list from the dropdown above to focus on tasks during this session.'
              : 'Select or create a list in the sidebar to get started.'}
          </div>
        ) : activeList.tasks.length === 0 ? (
          <div className="empty-state small">
            No tasks in this list yet. Add one above!
          </div>
        ) : (
          activeList.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              listId={activeList.id}
              onToggle={toggleTask}
              onRename={handleRenameTask}
              onDuplicate={duplicateTask}
              onDelete={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              isDragging={draggedId === task.id}
              isDragOver={dragOverId === task.id && draggedId !== task.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
