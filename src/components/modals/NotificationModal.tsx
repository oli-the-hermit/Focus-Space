import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
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
    <Modal isOpen={isOpen} title={strings.notifications.modalTitle} onClose={onClose} dismissible>
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
        <Select<number>
          value={state.notifications.leadMinutes}
          onChange={val => updateNotifications({ leadMinutes: val })}
          options={[
            { value: 5, label: strings.notifications.options.fiveMin },
            { value: 10, label: strings.notifications.options.tenMin },
            { value: 15, label: strings.notifications.options.fifteenMin },
            { value: 30, label: strings.notifications.options.thirtyMin }
          ]}
        />
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
