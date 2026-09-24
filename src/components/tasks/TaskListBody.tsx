import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskItem } from './TaskItem';
import { Task, TaskList } from '../../types';
import { strings } from '../../constants/strings';
import { IconPlus } from '../ui/icons';

export interface TaskListBodyProps {
  list: TaskList;
}

/**
 * Progress, add-task field and the draggable task rows for one list.
 * Shared by the Tasks tab and the timer page so both behave identically.
 */
export const TaskListBody: React.FC<TaskListBodyProps> = ({ list }) => {
  const { addTask, toggleTask, duplicateTask, deleteTask, openModal, reorderTasks } = useApp();

  const [newTaskText, setNewTaskText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const total = list.tasks.length;
  const done = list.tasks.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) reorderTasks(list.id, draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    addTask(list.id, newTaskText.trim());
    setNewTaskText('');
  };

  const handleRenameTask = (lId: string, task: Task) => openModal('RENAME_TASK', { listId: lId, task });

  const handleDeleteTask = (lId: string, task: Task) => {
    openModal('CONFIRM_DELETE', {
      title: strings.common.delete,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', task.text),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteTask(lId, task.id)
    });
  };

  return (
    <div className="task-list-body">
      {total > 0 && (
        <div className="list-progress" aria-label={`${pct}%`}>
          <div className="list-progress-row">
            <span>{strings.tasks.completedOf.replace('{done}', String(done)).replace('{total}', String(total))}</span>
            <span className="list-progress-pct">{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <form className="add-task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          className="form-input"
          placeholder={strings.tasks.addTaskPlaceholder}
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          autoComplete="off"
          aria-label={strings.tasks.addTaskPlaceholder}
        />
        <button type="submit" className="btn-action primary" disabled={!newTaskText.trim()}>
          <IconPlus size={16} strokeWidth={2.4} />
          {strings.tasks.addTaskBtn}
        </button>
      </form>

      <div className="task-list-items">
        {list.tasks.length === 0 ? (
          <div className="empty-state small">{strings.tasks.emptyTasks}</div>
        ) : (
          list.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              listId={list.id}
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
