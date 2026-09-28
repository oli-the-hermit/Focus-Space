import React, { useEffect, useState } from 'react';
import { IconMinus, IconPlus } from './icons';
import { useUiLabels } from './UiLabels';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unit shown after the number, e.g. "min". */
  suffix?: string;
  id?: string;
  ariaLabel?: string;
}

/** Numeric field with −/+ buttons. Typing is allowed; the value is clamped on blur. */
export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix,
  id,
  ariaLabel
}) => {
  const labels = useUiLabels();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commit = (raw: string) => {
    const n = Number(raw);
    const next = Number.isFinite(n) && raw.trim() !== '' ? clamp(Math.round(n)) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const bump = (dir: 1 | -1) => {
    // Snap to the step grid so 23 + 5 → 25, not 28.
    const base = dir > 0 ? Math.floor(value / step) * step + step : Math.ceil(value / step) * step - step;
    onChange(clamp(base));
  };

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => bump(-1)}
        disabled={value <= min}
        aria-label={labels.decrease}
        tabIndex={-1}
      >
        <IconMinus size={16} strokeWidth={2.4} />
      </button>
      <div className="stepper-field">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="stepper-input"
          value={draft}
          aria-label={ariaLabel}
          onChange={e => {
            const digits = e.target.value.replace(/[^\d]/g, '');
            setDraft(digits);
            // Propagate valid values right away so pressing Enter submits what was typed.
            const n = Number(digits);
            if (digits !== '' && n >= min && n <= max) onChange(n);
          }}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              bump(1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              bump(-1);
            }
          }}
        />
        {suffix && <span className="stepper-suffix">{suffix}</span>}
      </div>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => bump(1)}
        disabled={value >= max}
        aria-label={labels.increase}
        tabIndex={-1}
      >
        <IconPlus size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
};
