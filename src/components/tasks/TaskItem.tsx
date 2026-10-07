import React from 'react';
import { Task } from '../../types';
import { formatDuration } from '../../lib/formatUtils';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash, IconGrip } from '../ui/icons';
import { IconButton } from '../ui/IconButton';
import { Checkbox } from '../ui/Checkbox';

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
  /** Just added: plays the enter animation. */
  isNew?: boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
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
  isDragOver,
  isNew,
  onContextMenu
}) => {
  return (
    <div
      className={`task-row draggable-item ${task.completed ? 'done' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isNew ? 'item-enter' : ''}`}
      draggable={true}
      data-tid={task.id}
      data-id={task.id}
      onContextMenu={onContextMenu ? e => onContextMenu(e, task) : undefined}
      onDragStart={e => onDragStart(e, task.id)}
      onDragOver={e => onDragOver(e, task.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, task.id)}
    >
      <IconGrip title={strings.common.dragToReorder} />
      <Checkbox
        checked={task.completed}
        onChange={checked => onToggle(listId, task.id, checked)}
        aria-label={task.text}
      />
      <span className="task-text">{task.text}</span>

      {task.durationSeconds ? (
        <span className="task-time-badge" title={strings.tasks.completionTimeTooltip}>
          {formatDuration(task.durationSeconds)}
        </span>
      ) : null}

      <div className="task-row-actions">
        <IconButton
          label={strings.common.rename}
          size="xs"
          surface={3}
          onClick={() => onRename(listId, task)}
        >
          <IconEdit size={12} />
        </IconButton>
        <IconButton
          label={strings.common.duplicate}
          size="xs"
          surface={3}
          onClick={() => onDuplicate(listId, task.id)}
        >
          <IconCopy size={12} />
        </IconButton>
        <IconButton
          label={strings.common.delete}
          size="xs"
          surface={3}
          tone="danger"
          onClick={() => onDelete(listId, task)}
        >
          <IconTrash size={12} />
        </IconButton>
      </div>
    </div>
  );
};
