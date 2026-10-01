import React, { useRef, useState } from 'react';
import type { SnapshotList, SnapshotTask } from '../lib/timerSnapshot';
import type { MiniCommand } from '../lib/desktop';
import type { Task } from '../types';
import type { MenuItem } from '../components/ui/Menu';
import { TaskItem } from '../components/tasks/TaskItem';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import { IconCheck, IconCopy, IconEdit, IconPlus, IconReset, IconTrash } from '../components/ui/icons';
import { isDragLeavingElement } from '../lib/dnd';
import { strings } from '../constants/strings';
import { format } from '../lib/i18n';

export interface MiniTaskListProps {
  tasks: SnapshotTask[];
  /** The session's lists; new tasks go to one of them. */
  lists: SnapshotList[];
  onCommand: (cmd: MiniCommand) => void;
  /** The mini player's context menu, for a task's right-click menu. */
  openMenu: (e: React.MouseEvent, items: (MenuItem | false)[]) => void;
}

const key = (t: { listId: string; taskId: string }) => `${t.listId}:${t.taskId}`;
const asTask = (t: SnapshotTask): Task => ({ id: t.taskId, text: t.text, completed: t.done, durationSeconds: t.durationSeconds });

/**
 * The session's tasks in the mini player, with the app's own task rows: add, tick,
 * drag to reorder (within a list), rename, duplicate and delete. The mini window only
 * sends commands, so renaming and confirming a delete happen inline instead of in a
 * dialog. With several lists, the rows are grouped under their list's name and a
 * list picker sits next to the add field.
 */
export const MiniTaskList: React.FC<MiniTaskListProps> = ({ tasks, lists, onCommand, openMenu }) => {
  const [newText, setNewText] = useState('');
  const [addTo, setAddTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: string; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [dragged, setDragged] = useState<SnapshotTask | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const grouped = lists.length > 1;
  // The picked list, or the first one (also when the picked one left the session).
  const targetListId = lists.find(l => l.id === addTo)?.id ?? lists[0]?.id;

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text || !targetListId) return;
    onCommand({ type: 'add-task', listId: targetListId, text });
    setNewText('');
  };

  const find = (listId: string, taskId: string) => tasks.find(t => t.listId === listId && t.taskId === taskId);

  const startRename = (t: SnapshotTask) => {
    setConfirming(null);
    setEditing({ key: key(t), text: t.text });
  };

  // Enter commits and removes the field, which can also blur it: commit only once.
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const commitRename = (t: SnapshotTask) => {
    const text = editingRef.current?.text.trim();
    editingRef.current = null;
    if (text && text !== t.text) onCommand({ type: 'rename-task', listId: t.listId, taskId: t.taskId, text });
    setEditing(null);
  };

  const openTaskMenu = (e: React.MouseEvent, t: SnapshotTask) => {
    const cm = strings.actions;
    openMenu(e, [
      t.done
        ? { key: 'undo', label: cm.markNotDone, icon: <IconReset size={15} />, onSelect: () => onCommand({ type: 'toggle-task', listId: t.listId, taskId: t.taskId, checked: false }) }
        : { key: 'done', label: strings.common.markComplete, icon: <IconCheck size={15} />, onSelect: () => onCommand({ type: 'toggle-task', listId: t.listId, taskId: t.taskId, checked: true }) },
      { key: 'rename', label: strings.common.rename, icon: <IconEdit size={15} />, onSelect: () => startRename(t) },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => onCommand({ type: 'duplicate-task', listId: t.listId, taskId: t.taskId }) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: () => setConfirming(key(t)) }
    ]);
  };

  const renderTask = (t: SnapshotTask) => {
    const k = key(t);
    if (editing?.key === k) {
      return (
        <div key={k} className="task-row mini-task-edit">
          <TextInput
            value={editing.text}
            aria-label={strings.common.rename}
            autoFocus
            onChange={e => setEditing({ key: k, text: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename(t);
              if (e.key === 'Escape') {
                e.stopPropagation();
                setEditing(null);
              }
            }}
            onBlur={() => commitRename(t)}
          />
        </div>
      );
    }
    if (confirming === k) {
      return (
        <div key={k} className="task-row mini-task-confirm" role="alert">
          <span className="task-text">{format(strings.sessions.deleteConfirmPrompt, { name: t.text })}</span>
          <Button size="sm" onClick={() => setConfirming(null)}>{strings.common.cancel}</Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              onCommand({ type: 'delete-task', listId: t.listId, taskId: t.taskId });
              setConfirming(null);
            }}
          >
            {strings.common.delete}
          </Button>
        </div>
      );
    }
    return (
      <TaskItem
        key={k}
        task={asTask(t)}
        listId={t.listId}
        onToggle={(listId, taskId, checked) => onCommand({ type: 'toggle-task', listId, taskId, checked })}
        onRename={() => startRename(t)}
        onDuplicate={(listId, taskId) => onCommand({ type: 'duplicate-task', listId, taskId })}
        onDelete={() => {
          setEditing(null);
          setConfirming(k);
        }}
        onDragStart={(e, id) => {
          setDragged(find(t.listId, id) ?? null);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', id);
        }}
        onDragOver={(e, id) => {
          // Tasks move within their own list, as in the app.
          if (!dragged || dragged.listId !== t.listId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const over = key({ listId: t.listId, taskId: id });
          if (dragOver !== over) setDragOver(over);
        }}
        onDragLeave={e => {
          if (isDragLeavingElement(e)) setDragOver(null);
        }}
        onDrop={(e, id) => {
          e.preventDefault();
          if (dragged && dragged.listId === t.listId && dragged.taskId !== id) {
            onCommand({ type: 'reorder-tasks', listId: t.listId, sourceId: dragged.taskId, targetId: id });
          }
          setDragged(null);
          setDragOver(null);
        }}
        isDragging={!!dragged && key(dragged) === k}
        isDragOver={dragOver === k && !!dragged && key(dragged) !== k}
        onContextMenu={e => openTaskMenu(e, t)}
      />
    );
  };

  return (
    <div className="mini-task-area">
      <form className="add-task-form mini-add-task" onSubmit={addTask}>
        <TextInput
          placeholder={strings.tasks.addTaskPlaceholder}
          aria-label={strings.tasks.addTaskPlaceholder}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          autoComplete="off"
        />
        {grouped && targetListId && (
          <Select
            value={targetListId}
            onChange={setAddTo}
            ariaLabel={strings.mini.addToList}
            options={lists.map(l => ({ value: l.id, label: l.name }))}
          />
        )}
        <Button variant="primary" type="submit" disabled={!newText.trim()}>
          <IconPlus size={14} strokeWidth={2.4} />
          {strings.tasks.addTaskBtn}
        </Button>
      </form>

      <div className="mini-task-list task-list-items">
        {tasks.length === 0 && <p className="mini-tile-meta">{strings.tasks.emptyTasks}</p>}
        {grouped
          ? lists.map(list => {
              const listTasks = tasks.filter(t => t.listId === list.id);
              return listTasks.length ? (
                <React.Fragment key={list.id}>
                  <p className="mini-list-name">{list.name}</p>
                  {listTasks.map(renderTask)}
                </React.Fragment>
              ) : null;
            })
          : tasks.map(renderTask)}
      </div>
    </div>
  );
};
