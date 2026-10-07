import React, { useEffect, useRef, useState } from 'react';
import { strings } from '../../constants/strings';
import type { AlertActionId, AlertPayload } from '../../lib/notify';
import { IconBell, IconCalendar, IconClose } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export interface AlertCardProps {
  payload: AlertPayload;
  onAction: (action: AlertActionId) => void;
  onDismiss: () => void;
  /** Sits in its own always-on-top window (desktop) rather than inside the app. */
  standalone?: boolean;
}

/**
 * The "island": a dark pill with the alert, its actions and a countdown ring
 * that closes it. Hovering pauses the countdown.
 */
export const AlertCard: React.FC<AlertCardProps> = ({ payload, onAction, onDismiss, standalone }) => {
  const total = Math.max(1, payload.autoDismissSec) * 1000;
  const [left, setLeft] = useState(total);
  const pausedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    setLeft(total);
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (pausedRef.current) return;
      setLeft(prev => {
        const next = prev - dt;
        if (next <= 0) window.setTimeout(() => onDismissRef.current(), 0);
        return Math.max(0, next);
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [payload.id, total]);

  const isEvent = payload.kind === 'event-soon';
  const kindClass = payload.kind === 'break-done' ? 'is-focus-next' : payload.kind === 'focus-done' ? 'is-break-next' : 'is-event';

  return (
    <div
      className={`alert-card ${kindClass} ${standalone ? 'is-standalone' : ''}`}
      role="alertdialog"
      aria-labelledby={`alert-title-${payload.id}`}
      aria-describedby={`alert-body-${payload.id}`}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocus={() => (pausedRef.current = true)}
      onBlur={() => (pausedRef.current = false)}
      {...(standalone ? { 'data-tauri-drag-region': true } : {})}
    >
      <span className="alert-icon is-ringing" aria-hidden="true">
        {isEvent ? <IconCalendar size={20} /> : <IconBell size={20} className="bell-icon" />}
      </span>
      <div className="alert-text" {...(standalone ? { 'data-tauri-drag-region': true } : {})}>
        <div className="alert-title" id={`alert-title-${payload.id}`}>{payload.title}</div>
        <div className="alert-body" id={`alert-body-${payload.id}`}>{payload.body}</div>
      </div>
      <div className="alert-actions">
        {payload.actions.map(a => (
          <Button key={a.id} variant={a.primary ? 'primary' : 'secondary'} size="sm" surface={3} onClick={() => onAction(a.id)}>
            {a.label}
          </Button>
        ))}
      </div>
      <IconButton label={strings.alerts.dismiss} surface={3} className="alert-dismiss" onClick={onDismiss}>
        <ProgressRing className="alert-ring" value={left / total} box={40} radius={17} />
        <IconClose size={14} strokeWidth={2.4} />
      </IconButton>
    </div>
  );
};
