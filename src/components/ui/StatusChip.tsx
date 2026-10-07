import React from 'react';
import { cx } from '../../lib/cx';

export type StatusTone = 'idle' | 'running' | 'paused' | 'break';

export interface StatusChipProps {
  tone: StatusTone;
  label: string;
  /** A live value after the label, e.g. the countdown. */
  value?: React.ReactNode;
  /** Pressing the chip (e.g. go to the timer). */
  onOpen: () => void;
  openTitle?: string;
  /** A round action at the end, e.g. play/pause. */
  action?: { label: string; icon: React.ReactNode; onClick: () => void };
  id?: string;
  'data-tour'?: string;
}

/**
 * A pill that shows a live status: a colored dot, a label, an optional value and a
 * small action (styles: components/status-chip.css).
 */
export const StatusChip: React.FC<StatusChipProps> = ({ tone, label, value, onOpen, openTitle, action, id, 'data-tour': dataTour }) => (
  <div className={cx('status-chip', `is-${tone}`)} id={id} data-tour={dataTour}>
    <button type="button" className="status-chip-main" onClick={onOpen} title={openTitle}>
      <span className={cx('status-dot', tone)} />
      <span className="status-chip-label">{label}</span>
      {value !== undefined && <span className="status-chip-time">{value}</span>}
    </button>
    {action && (
      <button type="button" className="status-chip-action" onClick={action.onClick} aria-label={action.label} title={action.label}>
        {action.icon}
      </button>
    )}
  </div>
);
