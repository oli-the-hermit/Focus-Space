import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { strings } from '../../constants/strings';

export interface ListModalProps {
  list?: TaskList | null;
  onClose: () => void;
}

export const ListModal: React.FC<ListModalProps> = ({ list, onClose }) => {
  const { createList, renameList } = useApp();
  const [name, setName] = useState(list ? list.name : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = name.trim();
    if (!val) return;

    if (list) {
      renameList(list.id, val);
    } else {
      createList(val);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">{strings.modals.listNameLabel}</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.listNamePlaceholder}
          autoFocus
        />
      </div>

      <div className="modal-actions modal-form-actions">
        <button type="button" className="btn-action" onClick={onClose}>
          {strings.common.cancel}
        </button>
        <button type="submit" className="btn-action primary">
          {list ? strings.common.save : strings.modals.createListBtn}
        </button>
      </div>
    </form>
  );
};
