import React, { useEffect, useRef, useState } from 'react';
import { Popover } from './Popover';
import { IconClock } from './icons';
import { useUiLabels } from './UiLabels';

export interface TimePickerProps {
  /** 'HH:MM' (24h). */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  /** Minutes between suggested slots. */
  step?: number;
}

/** Accepts "9", "930", "9:5", "09:30" → "09:30". Returns null when not a valid time. */
export function normalizeTime(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let h: number;
  let m: number;
  const colon = s.match(/^(\d{1,2})\s*[:.h]\s*(\d{1,2})$/);
  if (colon) {
    h = Number(colon[1]);
    m = Number(colon[2]);
  } else if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) {
      h = Number(s);
      m = 0;
    } else {
      h = Number(s.slice(0, s.length - 2));
      m = Number(s.slice(-2));
    }
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, id, ariaLabel, step = 15 }) => {
  const labels = useUiLabels();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  const slots: string[] = [];
  for (let mins = 0; mins < 24 * 60; mins += step) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`);
  }

  // Open scrolled to the chosen time (or the nearest slot before it).
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const nearest = [...slots].reverse().find(s => s <= value) || slots[0];
      listRef.current?.querySelector<HTMLElement>(`[data-time="${nearest}"]`)?.scrollIntoView({ block: 'center' });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commitDraft = () => {
    const normalized = normalizeTime(draft);
    if (normalized) {
      setDraft(normalized);
      if (normalized !== value) onChange(normalized);
    } else {
      setDraft(value);
    }
  };

  return (
    <div className={`picker ${open ? 'is-open' : ''}`}>
      <div ref={fieldRef} className="picker-trigger picker-trigger--input" onClick={() => inputRef.current?.focus()}>
        <button
          type="button"
          className="picker-icon-btn"
          aria-label={labels.chooseTime}
          aria-haspopup="listbox"
          aria-expanded={open}
          // Keep focus in the input so its blur handler doesn't fight this toggle.
          onMouseDown={e => e.preventDefault()}
          onClick={e => {
            e.stopPropagation();
            inputRef.current?.focus();
            setOpen(o => !o);
          }}
        >
          <IconClock size={16} />
        </button>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          className="picker-input"
          value={draft}
          aria-label={ariaLabel}
          placeholder={labels.timePlaceholder}
          maxLength={5}
          onChange={e => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            commitDraft();
            setOpen(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDraft();
              setOpen(false);
            } else if (e.key === 'ArrowDown' && !open) {
              setOpen(true);
            }
          }}
        />
      </div>

      <Popover
        open={open}
        anchorRef={fieldRef}
        onClose={() => setOpen(false)}
        className="time-popover"
        role="listbox"
        ariaLabel={ariaLabel || 'Choose time'}
      >
        {/* preventDefault keeps focus in the input while clicking or scrolling the list */}
        <div className="time-slots" ref={listRef} onMouseDown={e => e.preventDefault()}>
          {slots.map(slot => (
            <button
              key={slot}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={slot === value}
              data-time={slot}
              className={`time-slot ${slot === value ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(slot);
                setDraft(slot);
                setOpen(false);
              }}
            >
              {slot}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
};
