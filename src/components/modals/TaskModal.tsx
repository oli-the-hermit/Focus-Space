import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';

export interface TaskModalProps {
  listId: string;
  task?: Task | null;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ listId, task, onClose }) => {
  const { addTask, renameTask } = useApp();
  const [text, setText] = useState(task ? task.text : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = text.trim();
    if (!val) return;

    if (task) {
      renameTask(listId, task.id, val);
    } else {
      addTask(listId, val);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Task Text</label>
        <input
          type="text"
          className="form-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. Design header component"
          autoFocus
        />
      </div>

      <div className="modal-actions" style={{ marginTop: '20px' }}>
        <button type="button" className="btn-action" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-action primary">
          {task ? 'Save' : 'Add Task'}
        </button>
      </div>
    </form>
  );
};
