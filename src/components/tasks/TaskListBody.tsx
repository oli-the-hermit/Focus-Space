import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskItem } from './TaskItem';
import { Task, TaskList } from '../../types';
import { strings } from '../../constants/strings';
import { IconCheck, IconCopy, IconEdit, IconPlus, IconReset, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { useFlip, useNewIds } from '../../hooks/useListMotion';
import { isDragLeavingElement } from '../../lib/dnd';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { ProgressBar } from '../ui/ProgressBar';

export interface TaskListBodyProps {
  list: TaskList;
}

/**
 * Progress, add-task field and the draggable task rows for one list.
 * Shared by the Tasks tab and the timer page so both behave identically.
 */
export const TaskListBody: React.FC<TaskListBodyProps> = ({ list }) => {
  const { addTask, toggleTask, duplicateTask, deleteTask, openModal, reorderTasks } = useApp();

  const contextMenu = useContextMenu();
  const itemsRef = useRef<HTMLDivElement>(null);
  const ids = list.tasks.map(t => t.id);
  const newIds = useNewIds(ids);
  useFlip(itemsRef, ids);

  const [newTaskText, setNewTaskText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const total = list.tasks.length;
  const done = list.tasks.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const completedLabel = strings.tasks.completedOf.replace('{done}', String(done)).replace('{total}', String(total));

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

  const handleDragLeave = (e: React.DragEvent) => {
    if (isDragLeavingElement(e)) setDragOverId(null);
  };

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

  const openTaskMenu = (e: React.MouseEvent, task: Task) => {
    const cm = strings.contextMenu;
    contextMenu(e, [
      task.completed
        ? { key: 'undo', label: cm.markNotDone, icon: <IconReset size={15} />, onSelect: () => toggleTask(list.id, task.id, false) }
        : { key: 'done', label: cm.markDone, icon: <IconCheck size={15} />, onSelect: () => toggleTask(list.id, task.id, true) },
      { key: 'rename', label: strings.common.rename, icon: <IconEdit size={15} />, onSelect: () => handleRenameTask(list.id, task) },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => duplicateTask(list.id, task.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: () => handleDeleteTask(list.id, task) }
    ]);
  };

  return (
    <div className="task-list-body">
      {total > 0 && (
        <div className="list-progress">
          <div className="list-progress-row">
            <span>{completedLabel}</span>
            <span className="list-progress-pct">{pct}%</span>
          </div>
          <ProgressBar value={pct} label={completedLabel} />
        </div>
      )}

      <form className="add-task-form" onSubmit={handleAddTask}>
        <TextInput
          placeholder={strings.tasks.addTaskPlaceholder}
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          autoComplete="off"
          aria-label={strings.tasks.addTaskPlaceholder}
        />
        <Button variant="primary" type="submit" disabled={!newTaskText.trim()}>
          <IconPlus size={16} strokeWidth={2.4} />
          {strings.tasks.addTaskBtn}
        </Button>
      </form>

      <div className="task-list-items" ref={itemsRef}>
        {list.tasks.length === 0 ? (
          <EmptyState size="sm">{strings.tasks.emptyTasks}</EmptyState>
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
              isNew={newIds.has(task.id)}
              onContextMenu={openTaskMenu}
            />
          ))
        )}
      </div>
    </div>
  );
};
