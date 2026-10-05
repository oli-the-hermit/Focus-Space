import React from 'react';
import { cx } from '../../lib/cx';

export interface SwitchProps {
  label: React.ReactNode;
  /** Muted text under the label. */
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** A settings row: label and hint on the left, the on/off toggle on the right (styles: components/switch.css). */
export const Switch: React.FC<SwitchProps> = ({ label, hint, checked, onChange, disabled, id, className }) => (
  <label className={cx('switch-row', className)}>
    <span className="switch-row-text">
      <span className="switch-row-title">{label}</span>
      {hint && <span className="switch-row-hint">{hint}</span>}
    </span>
    <input
      id={id}
      type="checkbox"
      role="switch"
      className="switch"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
    />
  </label>
);
