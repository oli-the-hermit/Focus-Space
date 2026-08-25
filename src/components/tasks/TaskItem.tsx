import React from 'react';
import { Task } from '../../types';
import { formatDuration } from '../../lib/formatUtils';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash, IconGrip } from '../ui/icons';

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
      <IconGrip title={strings.common.dragToReorder} />
      <input
        type="checkbox"
        className="task-check"
        checked={task.completed}
        onChange={e => onToggle(listId, task.id, e.target.checked)}
      />
      <span className="task-text">{task.text}</span>

      {task.durationSeconds ? (
        <span className="task-time-badge" title={strings.tasks.completionTimeTooltip}>
          ⏱️ {formatDuration(task.durationSeconds)}
        </span>
      ) : null}

      <div className="task-row-actions">
        <button
          className="icon-btn xs"
          onClick={() => onRename(listId, task)}
          title={strings.common.rename}
        >
          <IconEdit size={12} />
        </button>
        <button
          className="icon-btn xs"
          onClick={() => onDuplicate(listId, task.id)}
          title={strings.common.duplicate}
        >
          <IconCopy size={12} />
        </button>
        <button
          className="icon-btn xs danger"
          onClick={() => onDelete(listId, task)}
          title={strings.common.delete}
        >
          <IconTrash size={12} />
        </button>
      </div>
    </div>
  );
};
