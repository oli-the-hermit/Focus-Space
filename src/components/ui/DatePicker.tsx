import React, { useEffect, useRef, useState } from 'react';
import { Popover } from './Popover';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconClose } from './icons';
import { formatDateStr, getDaysInMonth, getTodayStr, parseDateStr } from '../../lib/dateUtils';
import { formatDateLabel } from '../../lib/formatUtils';
import { useUiLabels } from './UiLabels';
import { IconButton } from './IconButton';
import { TextButton } from './TextButton';
import { LOCALE, weekdayNames } from '../../lib/i18n';

export interface DatePickerProps {
  /** 'YYYY-MM-DD', or '' when empty. */
  value: string;
  onChange: (value: string) => void;
  /** Allows clearing the value back to ''. */
  optional?: boolean;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  /** Dates before this 'YYYY-MM-DD' are disabled. */
  min?: string;
}

/** Two-letter weekday headers, Monday first. */
const WEEKDAYS = weekdayNames('short').map(d => d.slice(0, 2));

function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

function addMonths(dateStr: string, months: number): string {
  const d = parseDateStr(dateStr);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, getDaysInMonth(d.getFullYear(), d.getMonth())));
  return formatDateStr(d);
}

/** Always 6 weeks (42 cells, Monday first) so the popover never changes height. */
function buildMonthCells(viewStr: string): { dStr: string; day: number; inMonth: boolean }[] {
  const view = parseDateStr(viewStr);
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ dStr: formatDateStr(d), day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  optional = false,
  placeholder = 'Pick a date',
  id,
  ariaLabel,
  min
}) => {
  const labels = useUiLabels();
  const [open, setOpen] = useState(false);
  const [focusDate, setFocusDate] = useState<string>(value || getTodayStr());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const todayStr = getTodayStr();

  const openPicker = () => {
    setFocusDate(value || todayStr);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (dStr: string) => {
    if (min && dStr < min) return;
    onChange(dStr);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open, focusDate]);

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDate, -1),
      ArrowRight: () => addDays(focusDate, 1),
      ArrowUp: () => addDays(focusDate, -7),
      ArrowDown: () => addDays(focusDate, 7),
      PageUp: () => addMonths(focusDate, -1),
      PageDown: () => addMonths(focusDate, 1)
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocusDate(moves[e.key]());
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(focusDate);
    }
  };

  const viewDate = parseDateStr(focusDate);
  const monthLabel = viewDate.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  const cells = buildMonthCells(focusDate);

  return (
    <div className={`picker ${open ? 'is-open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={e => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <IconCalendar size={16} />
        <span className={`picker-value ${value ? '' : 'is-placeholder'}`}>
          {value ? formatDateLabel(value) : placeholder}
        </span>
      </button>
      {optional && value && (
        <button
          type="button"
          className="picker-clear"
          onClick={() => onChange('')}
          aria-label={labels.clearDate}
          title={labels.clear}
        >
          <IconClose size={14} strokeWidth={2.4} />
        </button>
      )}

      <Popover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        onEscape={close}
        matchWidth={false}
        className="date-popover"
        role="dialog"
        ariaLabel={ariaLabel || 'Choose date'}
      >
        <div className="date-popover-head">
          <span className="date-popover-month">{monthLabel}</span>
          <div className="date-popover-nav">
            <IconButton
              label={labels.prevMonth}
              size="sm"
              onClick={() => setFocusDate(addMonths(focusDate, -1))}
            >
              <IconChevronLeft size={16} />
            </IconButton>
            <IconButton
              label={labels.nextMonth}
              size="sm"
              onClick={() => setFocusDate(addMonths(focusDate, 1))}
            >
              <IconChevronRight size={16} />
            </IconButton>
          </div>
        </div>

        <div className="date-grid-weekdays" aria-hidden="true">
          {WEEKDAYS.map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="date-grid" role="grid" ref={gridRef} onKeyDown={handleGridKeyDown}>
          {cells.map(cell => {
            const isSelected = cell.dStr === value;
            const isToday = cell.dStr === todayStr;
            const isDisabled = !!min && cell.dStr < min;
            return (
              <button
                key={cell.dStr}
                type="button"
                role="gridcell"
                data-date={cell.dStr}
                tabIndex={cell.dStr === focusDate ? 0 : -1}
                aria-selected={isSelected}
                disabled={isDisabled}
                className={`date-cell ${cell.inMonth ? '' : 'is-outside'} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => pick(cell.dStr)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="date-popover-foot">
          {optional && (
            <TextButton
              onClick={() => {
                onChange('');
                close();
              }}
            >
              {labels.clear}
            </TextButton>
          )}
          <TextButton accent onClick={() => pick(todayStr)}>
            {labels.today}
          </TextButton>
        </div>
      </Popover>
    </div>
  );
};
