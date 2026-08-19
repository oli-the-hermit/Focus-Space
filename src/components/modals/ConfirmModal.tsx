import React from 'react';

export interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose
}) => {
  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '20px', lineHeight: 1.5 }}>
        {message}
      </p>
      <div className="modal-actions">
        <button type="button" className="btn-action" onClick={onClose}>
          Cancel
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
