import React, { useRef } from 'react';
import { cx } from '../../lib/cx';
import { radioKeyTarget } from '../../lib/radioKeys';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** `md` (default) for page toolbars, `lg` for settings. */
  size?: 'md' | 'lg';
  /** The surface it sits on: the track is one step above it. */
  surface?: 0 | 1;
  id?: string;
  className?: string;
}

/**
 * A row of pill options, one of which is selected (styles: components/segmented.css).
 * A radio group: one tab stop, the arrow keys move and select, Home and End jump to the ends.
 */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  surface = 0,
  id,
  className
}: SegmentedControlProps<T>): React.ReactElement => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex(o => o.value === value);
  const tabStop = selected >= 0 ? selected : 0;

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const target = radioKeyTarget(e.key, i, options.length, 1);
    if (target === null) return;
    e.preventDefault();
    if (target === i) return;
    refs.current[target]?.focus();
    onChange(options[target].value);
  };

  return (
    <div
      id={id}
      className={cx('segmented', size === 'lg' && 'segmented--lg', surface === 1 && 'segmented--on-1', className)}
      role="radiogroup"
      aria-label={ariaLabel}
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
            tabIndex={i === tabStop ? 0 : -1}
            className={cx('segmented-option', checked && 'is-selected')}
            onClick={() => onChange(o.value)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
