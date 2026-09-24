import React, { useEffect, useRef } from 'react';
import { IconClose } from './icons';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  wide?: boolean;
  /**
   * When true, Escape also closes the modal. Form modals leave this off so typed
   * input is only discarded through the explicit X / Cancel buttons.
   * Clicking the backdrop never closes a modal.
   */
  dismissible?: boolean;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, wide = false, dismissible = false, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Autofocus the first field unless a child already claimed focus (autoFocus).
    const timer = setTimeout(() => {
      if (modalRef.current?.contains(document.activeElement)) return;
      const firstInput = modalRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, .select-trigger, .picker-trigger'
      );
      firstInput?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, dismissible]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" id="modalBackdrop">
      <div
        ref={modalRef}
        className={`modal ${wide ? 'wide' : ''}`}
        id="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="modal-header">
          <h3 className="modal-title" id="modalTitle">{title}</h3>
          <button type="button" className="icon-btn" id="closeModalBtn" aria-label="Close" onClick={onClose}>
            <IconClose size={18} strokeWidth={2.2} />
          </button>
        </div>
        <div className="modal-body" id="modalBody">
          {children}
        </div>
      </div>
    </div>
  );
};
