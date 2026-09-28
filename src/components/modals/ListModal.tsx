import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { Field, TextInput } from '../ui/Field';

export interface ListModalProps {
  list?: TaskList | null;
  onClose: () => void;
}

// Sentinel for "create a new session for this list" — never a real session id.
const NEW_SESSION = '__new_session__';

export const ListModal: React.FC<ListModalProps> = ({ list, onClose }) => {
  const { state, createList, renameList, setSessionTaskLists, openModal } = useApp();
  const [name, setName] = useState(list ? list.name : '');
  const [sessionChoice, setSessionChoice] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = name.trim();
    if (!val) return;

    if (list) {
      renameList(list.id, val);
      onClose();
      return;
    }

    const newListId = createList(val);

    if (sessionChoice === NEW_SESSION) {
      // Hand off to the session dialog with this list preselected (still changeable there).
      openModal('NEW_SESSION', { taskListIds: [newListId] });
      return;
    }

    if (sessionChoice) {
      const target = state.sessions.find(s => s.id === sessionChoice);
      if (target) setSessionTaskLists(target.id, [...(target.taskListIds || []), newListId]);
    }
    onClose();
  };

  const dirty = useDirty([name, sessionChoice]);

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <Field label={strings.modals.listNameLabel} htmlFor="listName">
        <TextInput
          id="listName"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.listNamePlaceholder}
          autoFocus
        />
      </Field>

      {!list && (
        <Field label={strings.modals.assignSessionLabel} group>
          <Select
            value={sessionChoice}
            onChange={setSessionChoice}
            ariaLabel={strings.modals.assignSessionLabel}
            options={[
              { value: '', label: strings.modals.noSessionOption },
              ...state.sessions.map(s => ({
                value: s.id,
                label: s.name,
                meta: `${s.focusMinutes}′ · ${s.breakMinutes}′`
              })),
              { value: NEW_SESSION, label: `+ ${strings.modals.createSessionOption}`, searchText: strings.modals.createSessionOption }
            ]}
          />
        </Field>
      )}

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryDisabled={!name.trim()}
        primaryLabel={
          list
            ? strings.common.save
            : sessionChoice === NEW_SESSION
              ? strings.modals.createListAndSessionBtn
              : strings.modals.createListBtn
        }
      />
    </form>
  );
};
