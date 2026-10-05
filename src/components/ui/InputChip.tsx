import React from 'react';
import { IconClose } from './icons';
import { useUiLabels } from './UiLabels';

export interface InputChipProps {
  label: string;
  icon?: React.ReactNode;
  /** A short count or tag after the label. */
  meta?: React.ReactNode;
  /** Shows the remove button. */
  onRemove?: () => void;
  /** Accessible name of the remove button; defaults to "Remove: {label}". */
  removeLabel?: string;
}

/** A chip standing for something picked in a form, with a remove button (styles: components/input-chip.css). */
export const InputChip: React.FC<InputChipProps> = ({ label, icon, meta, onRemove, removeLabel }) => {
  const labels = useUiLabels();
  return (
    <span className="input-chip">
      {icon}
      <span className="input-chip-label">{label}</span>
      {meta !== undefined && <span className="input-chip-meta">{meta}</span>}
      {onRemove && (
        <button
          type="button"
          className="input-chip-remove"
          onClick={onRemove}
          aria-label={removeLabel ?? `${labels.remove}: ${label}`}
        >
          <IconClose size={13} strokeWidth={2.4} />
        </button>
      )}
    </span>
  );
};

/** Wraps a row of chips. */
export const ChipSet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="chip-set">{children}</div>
);
