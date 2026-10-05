import React from 'react';
import { Button } from './Button';
import { ActionRow } from './ActionRow';
import { useUiLabels } from './UiLabels';

export interface ConfirmModalProps {
  title?: string;
  message: string;
  /** Defaults to "Delete". */
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** The body of a confirm dialog: the question, then Cancel and a danger action. */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, confirmLabel, onConfirm, onClose }) => {
  const labels = useUiLabels();
  return (
    <div>
      <p className="confirm-modal-message">{message}</p>
      <ActionRow>
        <Button onClick={onClose}>{labels.cancel}</Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          autoFocus
        >
          {confirmLabel ?? labels.delete}
        </Button>
      </ActionRow>
    </div>
  );
};
