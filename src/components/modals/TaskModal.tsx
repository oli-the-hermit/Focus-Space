import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';
import { strings } from '../../constants/strings';
import { Field, TextInput } from '../ui/Field';

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

  const dirty = useDirty(text);

  return (
    <form onSubmit={handleSubmit}>
      <Field label={strings.modals.taskTextLabel}>
        <TextInput
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={strings.modals.taskTextPlaceholder}
          autoFocus
        />
      </Field>

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryLabel={task ? strings.common.save : strings.modals.addTaskBtn}
      />
    </form>
  );
};
