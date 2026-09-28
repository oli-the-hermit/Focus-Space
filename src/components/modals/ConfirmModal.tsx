import React from 'react';
import { strings } from '../../constants/strings';
import { Button } from '../ui/Button';

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
        <Button onClick={onClose}>
          {strings.common.cancel}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          autoFocus
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
};
