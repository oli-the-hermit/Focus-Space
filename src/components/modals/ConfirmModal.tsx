import React from 'react';
import { strings } from '../../constants/strings';

export interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  confirmLabel = strings.common.delete,
  onConfirm,
  onClose
}) => {
  return (
    <div>
      <p className="confirm-modal-message">
        {message}
      </p>
      <div className="modal-actions">
        <button type="button" className="btn-action" onClick={onClose}>
          {strings.common.cancel}
        </button>
        <button
          type="button"
          className="btn-action danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};
