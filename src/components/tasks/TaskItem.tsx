import React from 'react';
import { Task } from '../../types';

export interface TaskItemProps {
  task: Task;
  listId: string;
  onToggle: (listId: string, taskId: string, checked: boolean) => void;
  onRename: (listId: string, task: Task) => void;
  onDuplicate: (listId: string, taskId: string) => void;
  onDelete: (listId: string, task: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  listId,
  onToggle,
  onRename,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver
}) => {
  return (
    <div
      className={`task-row draggable-item ${task.completed ? 'done' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable={true}
      data-tid={task.id}
      onDragStart={e => onDragStart(e, task.id)}
      onDragOver={e => onDragOver(e, task.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, task.id)}
    >
      <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
      <input
        type="checkbox"
        className="task-check"
        checked={task.completed}
        onChange={e => onToggle(listId, task.id, e.target.checked)}
      />
      <span className="task-text">{task.text}</span>

      {task.durationSeconds ? (
        <span className="task-time-badge" title="Completion time">
          ⏱️ {formatDuration(task.durationSeconds)}
        </span>
      ) : null}

      <div className="task-row-actions">
        <button
          className="icon-btn xs"
          onClick={() => onRename(listId, task)}
          title="Rename"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className="icon-btn xs"
          onClick={() => onDuplicate(listId, task.id)}
          title="Duplicate"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          className="icon-btn xs danger"
          onClick={() => onDelete(listId, task)}
          title="Delete"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
