import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { strings } from '../../constants/strings';

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
        <label className="form-label">{strings.modals.taskTextLabel}</label>
        <input
          type="text"
          className="form-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={strings.modals.taskTextPlaceholder}
          autoFocus
        />
      </div>

      <div className="modal-actions modal-form-actions">
        <button type="button" className="btn-action" onClick={onClose}>
          {strings.common.cancel}
        </button>
        <button type="submit" className="btn-action primary">
          {task ? strings.common.save : strings.modals.addTaskBtn}
        </button>
      </div>
    </form>
  );
};
