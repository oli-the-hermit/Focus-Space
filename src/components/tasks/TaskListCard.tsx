import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskItem } from './TaskItem';
import { Task } from '../../types';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash } from '../ui/icons';

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
      ? `${activeSession?.name || strings.timer.focusPhase} · ${activeList.name}`
      : (activeSession?.name || strings.timer.focusPhase);
  } else {
    titleText = activeList ? activeList.name : strings.tasks.selectListPrompt;
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
        title: strings.tasks.deleteTooltip,
        message: strings.sessions.deleteConfirmPrompt.replace('{name}', activeList.name),
        confirmLabel: strings.common.delete,
        onConfirm: () => deleteList(activeList.id)
      });
    }
  };

  const handleRenameTask = (lId: string, task: Task) => {
    openModal('RENAME_TASK', { listId: lId, task });
  };

  const handleDeleteTask = (lId: string, task: Task) => {
    openModal('CONFIRM_DELETE', {
      title: strings.common.delete,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', task.text),
      confirmLabel: strings.common.delete,
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
              {strings.tasks.tasksRemaining.replace('{count}', String(remainingCount))}
            </span>
          </div>

          {activeList && (
            <div className="tch-actions" id="listActions">
              <button
                className="icon-btn xs"
                id="renameListBtn"
                onClick={handleRenameList}
                title={strings.tasks.renameTooltip}
              >
                <IconEdit size={14} />
              </button>
              <button
                className="icon-btn xs"
                id="duplicateListBtn"
                onClick={() => duplicateList(activeList.id)}
                title={strings.tasks.duplicateTooltip}
              >
                <IconCopy size={14} />
              </button>
              <button
                className="icon-btn xs danger"
                id="deleteListBtn"
                onClick={handleDeleteList}
                title={strings.tasks.deleteTooltip}
              >
                <IconTrash size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Task List Dropdown in Timer & Sessions */}
      {inTimer && (
        <div className="timer-list-select-wrapper timer-list-select-container">
          <select
            className="form-select"
            id="focusListSelect"
            value={state.selectedListIdForTimer || ''}
            onChange={e => setSelectedListForTimer(e.target.value || null)}
          >
            <option value="">{strings.tasks.selectListPromptDropdown}</option>
            {state.taskLists.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} ({strings.tasks.tasksRemaining.replace('{count}', String(l.tasks.filter(t => !t.completed).length))})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Progress Bar */}
      {activeList && total > 0 && (
        <div className="tch-progress tch-progress-spaced" id="listProgress">
          <div className="progress-row">
            <span id="progressLabel">
              {strings.tasks.completedOf.replace('{done}', String(done)).replace('{total}', String(total))}
            </span>
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
            placeholder={strings.tasks.addTaskPlaceholder}
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn-action primary">
            {strings.tasks.addTaskBtn}
          </button>
        </form>
      )}

      {/* Task List Items */}
      <div className="task-list-items" id="taskItems">
        {!activeList ? (
          <div className="empty-state small">
            {inTimer
              ? strings.timer.selectTaskListPrompt
              : strings.tasks.emptyListPrompt}
          </div>
        ) : activeList.tasks.length === 0 ? (
          <div className="empty-state small">
            {strings.tasks.emptyLists}
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
