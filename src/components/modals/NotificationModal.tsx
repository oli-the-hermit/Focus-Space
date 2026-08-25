import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { strings } from '../../constants/strings';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { state, updateNotifications } = useApp();

  const handleRequestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} title={strings.notifications.modalTitle} onClose={onClose}>
      <div className="form-group">
        <label className="form-label notif-checkbox-label">
          <input
            type="checkbox"
            checked={state.notifications.enabled}
            onChange={e => updateNotifications({ enabled: e.target.checked })}
          />
          {strings.notifications.enableLabel}
        </label>
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.notifications.leadTimeLabel}</label>
        <select
          className="form-select"
          value={state.notifications.leadMinutes}
          onChange={e => updateNotifications({ leadMinutes: Number(e.target.value) })}
        >
          <option value={5}>{strings.notifications.options.fiveMin}</option>
          <option value={10}>{strings.notifications.options.tenMin}</option>
          <option value={15}>{strings.notifications.options.fifteenMin}</option>
          <option value={30}>{strings.notifications.options.thirtyMin}</option>
        </select>
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label notif-checkbox-label">
          <input
            type="checkbox"
            checked={state.notifications.sound}
            onChange={e => updateNotifications({ sound: e.target.checked })}
          />
          {strings.notifications.soundLabel}
        </label>
      </div>

      <div className="modal-actions modal-form-actions">
        <button
          type="button"
          className="btn-action primary"
          onClick={handleRequestPermission}
        >
          {strings.notifications.requestPermBtn}
        </button>
      </div>
    </Modal>
  );
};
