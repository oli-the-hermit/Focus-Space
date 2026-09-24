import React, { useEffect, useRef, useState } from 'react';
import { TimerSnapshot } from '../lib/timerSnapshot';
import { MiniCommand } from '../lib/desktop';
import { formatClock } from '../lib/formatUtils';
import { strings } from '../constants/strings';
import {
  IconClose,
  IconExpand,
  IconLayers,
  IconPause,
  IconPin,
  IconPlay,
  IconReset,
  IconSkip
} from '../components/ui/icons';

export interface MiniWindowControls {
  pinned?: boolean;
  alwaysOnTop?: boolean;
  onTogglePin?: () => void;
  onToggleAlwaysOnTop?: () => void;
  onExpand?: () => void;
  onClose: () => void;
}

export interface MiniPlayerProps {
  snapshot: TimerSnapshot | null;
  onCommand: (cmd: MiniCommand) => void;
  controls: MiniWindowControls;
  /** Adds Tauri drag-region attributes so the frameless window can be moved. */
  draggable?: boolean;
}

/**
 * Compact player shown outside the main window (Tauri window or Document PiP).
 * It ticks on its own window's clock so the display stays live even while the
 * main window is minimized and throttled.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = ({ snapshot, onCommand, controls, draggable = false }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const syncedForRef = useRef<number | null>(null);

  const running = snapshot?.status === 'running' && !!snapshot.targetEndTime;

  useEffect(() => {
    if (!running) return;
    const win = rootRef.current?.ownerDocument.defaultView || window;
    const id = win.setInterval(() => setNow(Date.now()), 250);
    return () => win.clearInterval(id);
  }, [running]);

  const remaining = running
    ? Math.max(0, Math.ceil((snapshot!.targetEndTime! - now) / 1000))
    : snapshot?.remaining ?? 0;

  // Ask the main window to complete the phase exactly once per run.
  useEffect(() => {
    if (!running || remaining > 0) return;
    if (syncedForRef.current === snapshot!.targetEndTime) return;
    syncedForRef.current = snapshot!.targetEndTime;
    onCommand('sync');
  }, [running, remaining, snapshot, onCommand]);

  const drag = draggable ? { 'data-tauri-drag-region': true } : {};

  if (!snapshot) {
    return (
      <div className="mini-player is-waiting" ref={rootRef} {...drag}>
        <span className="mini-waiting" {...drag}>{strings.mini.waiting}</span>
        <button type="button" className="mini-win-btn mini-close-solo" onClick={controls.onClose} aria-label={strings.mini.close} title={strings.mini.close}>
          <IconClose size={14} strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  const total = snapshot.total || 1;
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const isBreak = snapshot.phase === 'break';

  return (
    <div
      ref={rootRef}
      className={`mini-player ${isBreak ? 'is-break' : 'is-focus'} ${running ? 'is-running' : ''}`}
      {...drag}
    >
      <div className="mini-art" {...drag}>
        <span className="mini-art-phase" {...drag}>
          {isBreak ? strings.timer.breakPhase : strings.timer.focusPhase}
        </span>
        <span className="mini-art-time" {...drag}>{formatClock(remaining)}</span>
      </div>

      <div className="mini-main" {...drag}>
        <div className="mini-top" {...drag}>
          <div className="mini-titles" {...drag}>
            <span className="mini-title" title={snapshot.sessionName} {...drag}>{snapshot.sessionName}</span>
            <span className="mini-subtitle" title={snapshot.currentTask || ''} {...drag}>
              {snapshot.currentTask || strings.timer.noOpenTasks}
            </span>
          </div>
          <div className="mini-window-controls">
            {controls.onTogglePin && (
              <button
                type="button"
                className={`mini-win-btn ${controls.pinned ? 'is-on' : ''}`}
                onClick={controls.onTogglePin}
                aria-pressed={!!controls.pinned}
                aria-label={controls.pinned ? strings.mini.unpin : strings.mini.pin}
                title={controls.pinned ? strings.mini.unpin : strings.mini.pin}
              >
                <IconPin size={14} />
              </button>
            )}
            {controls.onToggleAlwaysOnTop && (
              <button
                type="button"
                className={`mini-win-btn ${controls.alwaysOnTop ? 'is-on' : ''}`}
                onClick={controls.onToggleAlwaysOnTop}
                aria-pressed={!!controls.alwaysOnTop}
                aria-label={controls.alwaysOnTop ? strings.mini.alwaysOnTopOn : strings.mini.alwaysOnTopOff}
                title={controls.alwaysOnTop ? strings.mini.alwaysOnTopOn : strings.mini.alwaysOnTopOff}
              >
                <IconLayers size={14} />
              </button>
            )}
            {controls.onExpand && (
              <button
                type="button"
                className="mini-win-btn"
                onClick={controls.onExpand}
                aria-label={strings.mini.expand}
                title={strings.mini.expand}
              >
                <IconExpand size={13} />
              </button>
            )}
            <button
              type="button"
              className="mini-win-btn"
              onClick={controls.onClose}
              aria-label={strings.mini.close}
              title={strings.mini.close}
            >
              <IconClose size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <div className="mini-scrubber" {...drag}>
          <div className="scrubber-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="scrubber-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mini-bottom" {...drag}>
          <span className="mini-time-small" {...drag}>{formatClock(total - remaining)}</span>
          <div className="mini-controls">
            <button type="button" className="mini-ctrl" onClick={() => onCommand('reset')} aria-label={strings.timer.resetTooltip} title={strings.timer.resetTooltip}>
              <IconReset size={16} />
            </button>
            <button
              type="button"
              className="mini-ctrl mini-ctrl--play"
              onClick={() => onCommand('toggle')}
              aria-label={running ? strings.timer.pauseTooltip : strings.timer.playTooltip}
              title={running ? strings.timer.pauseTooltip : strings.timer.playTooltip}
            >
              {running ? <IconPause size={16} /> : <IconPlay size={16} />}
            </button>
            <button type="button" className="mini-ctrl" onClick={() => onCommand('skip')} aria-label={strings.timer.skipTooltip} title={strings.timer.skipTooltip}>
              <IconSkip size={15} />
            </button>
          </div>
          <span className="mini-time-small" {...drag}>{formatClock(total)}</span>
        </div>
      </div>
    </div>
  );
};
