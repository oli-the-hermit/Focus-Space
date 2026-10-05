import React, { useRef } from 'react';
import { IconCheck } from './icons';
import { radioKeyTarget } from '../../lib/radioKeys';

export interface SwatchOption {
  value: string;
  /** Accessible name and tooltip. */
  label: string;
  /** The swatch fill. */
  color: string;
  /** The check mark's color, readable on the fill. */
  onColor: string;
}

export interface ColorSwatchGridProps {
  options: SwatchOption[];
  /** The selected value; null (or a value not in this grid) selects nothing here. */
  value: string | null;
  onChange: (value: string) => void;
  ariaLabel: string;
  /** Swatches per row; arrow up/down moves by this many. */
  columns?: number;
}

/**
 * A radio group of round color swatches. One tab stop; the arrow keys move through
 * the grid and select (like any radio group), Home and End jump to the ends.
 */
export const ColorSwatchGrid: React.FC<ColorSwatchGridProps> = ({ options, value, onChange, ariaLabel, columns = 8 }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex(o => o.value === value);
  const tabStop = selected >= 0 ? selected : 0;

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const target = radioKeyTarget(e.key, i, options.length, columns);
    if (target === null) return;
    e.preventDefault();
    if (target === i) return;
    refs.current[target]?.focus();
    onChange(options[target].value);
  };

  return (
    <div
      className="swatch-grid"
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ '--swatch-columns': columns } as React.CSSProperties}
    >
      {options.map((o, i) => {
        const checked = i === selected;
        return (
          <button
            key={o.value}
            ref={el => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={o.label}
            title={o.label}
            tabIndex={i === tabStop ? 0 : -1}
            className={`swatch ${checked ? 'is-selected' : ''}`}
            style={{ '--swatch': o.color, '--on-swatch': o.onColor } as React.CSSProperties}
            onClick={() => onChange(o.value)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {checked && <IconCheck size={18} strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
};
