import React, { useEffect, useRef, useState } from 'react';
import { IconClose } from './icons';
import { strings } from '../../constants/strings';
import { IconButton } from './IconButton';

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

/** Matches --dur-2: how long a closing modal stays mounted to play its exit. */
const EXIT_MS = 180;

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, wide = false, dismissible = false, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Keep the last content on screen while the exit animation plays.
  const [mounted, setMounted] = useState(isOpen);
  const lastRef = useRef({ title, children });
  if (isOpen) lastRef.current = { title, children };

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [isOpen]);

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

  if (!isOpen && !mounted) return null;
  const shown = isOpen ? { title, children } : lastRef.current;

  return (
    <div className={`modal-backdrop ${isOpen ? '' : 'is-closing'}`} id="modalBackdrop" aria-hidden={!isOpen || undefined}>
      <div
        ref={modalRef}
        className={`modal ${wide ? 'wide' : ''}`}
        id="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <div className="modal-header">
          <h3 className="modal-title" id="modalTitle">{shown.title}</h3>
          <IconButton label={strings.ui.close} id="closeModalBtn" onClick={onClose}>
            <IconClose size={18} strokeWidth={2.2} />
          </IconButton>
        </div>
        <div className="modal-body" id="modalBody">
          {shown.children}
        </div>
      </div>
    </div>
  );
};
