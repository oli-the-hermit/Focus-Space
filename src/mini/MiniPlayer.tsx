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
import { IconSwap } from '../components/ui/IconSwap';
import { useContextMenuState } from '../components/ui/ContextMenu';
import { MenuItem } from '../components/ui/Menu';
import { Scrubber } from '../components/timer/Scrubber';
import { TIMING } from '../constants/timing';

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

// Progress ring geometry (viewBox 0 0 100 100).
const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Player shown outside the main window (Tauri window or Document PiP).
 * One markup, three layouts picked by container queries in mini.css:
 *   compact (default row) · portrait (column with a progress ring) · large (dashboard tiles).
 * It ticks on its own window's clock so the display stays live even while the
 * main window is minimized and throttled.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = ({ snapshot, onCommand, controls, draggable = false }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const syncedForRef = useRef<number | null>(null);
  const menu = useContextMenuState();

  const running = snapshot?.status === 'running' && !!snapshot.targetEndTime;

  useEffect(() => {
    if (!running) return;
    const win = rootRef.current?.ownerDocument.defaultView || window;
    const id = win.setInterval(() => setNow(Date.now()), TIMING.miniClockTickMs);
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

  const menuItems = (): (MenuItem | false)[] => {
    const cm = strings.actions;
    return [
      !!snapshot && {
        key: 'toggle',
        label: running ? cm.pauseTimer : cm.startTimer,
        icon: running ? <IconPause size={15} /> : <IconPlay size={15} />,
        onSelect: () => onCommand('toggle')
      },
      !!snapshot && { key: 'reset', label: cm.resetTimer, icon: <IconReset size={16} />, onSelect: () => onCommand('reset') },
      !!snapshot && {
        key: 'skip',
        label: snapshot.phase === 'break' ? cm.skipToFocus : cm.skipToBreak,
        icon: <IconSkip size={16} />,
        onSelect: () => onCommand('skip')
      },
      { key: 'd1', divider: true },
      !!controls.onTogglePin && {
        key: 'pin',
        label: controls.pinned ? strings.mini.unpin : strings.mini.pin,
        icon: <IconPin size={15} />,
        onSelect: controls.onTogglePin
      },
      !!controls.onToggleAlwaysOnTop && {
        key: 'top',
        label: controls.alwaysOnTop ? strings.mini.alwaysOnTopOn : strings.mini.alwaysOnTopOff,
        icon: <IconLayers size={15} />,
        onSelect: controls.onToggleAlwaysOnTop
      },
      !!controls.onExpand && { key: 'open', label: cm.openApp, icon: <IconExpand size={14} />, onSelect: controls.onExpand },
      { key: 'd2', divider: true },
      { key: 'close', label: cm.closeMini, icon: <IconClose size={15} />, onSelect: controls.onClose }
    ];
  };

  const onContextMenu = (e: React.MouseEvent) => menu.openMenu(e, menuItems());

  if (!snapshot) {
    return (
      <div className="mini-shell" onContextMenu={onContextMenu}>
        <div className="mini-player is-waiting" ref={rootRef} {...drag}>
          <span className="mini-waiting" {...drag}>{strings.mini.waiting}</span>
          <button type="button" className="mini-win-btn mini-close-solo" onClick={controls.onClose} aria-label={strings.mini.close} title={strings.mini.close}>
            <IconClose size={14} strokeWidth={2.4} />
          </button>
        </div>
        {menu.element}
      </div>
    );
  }

  const total = snapshot.total || 1;
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const isBreak = snapshot.phase === 'break';
  const nextLabel = isBreak ? strings.timer.focusPhase : strings.timer.breakPhase;

  return (
    <div className="mini-shell" onContextMenu={onContextMenu}>
      <div
        ref={rootRef}
        className={`mini-player ${isBreak ? 'is-break' : 'is-focus'} ${running ? 'is-running' : ''}`}
        {...drag}
      >
        <div className="mini-art" {...drag}>
          <svg className="mini-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="mini-ring-track" cx="50" cy="50" r={RING_R} />
            <circle
              className="mini-ring-fill"
              cx="50"
              cy="50"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - pct / 100)}
            />
          </svg>
          <span className="mini-art-phase" {...drag}>
            {isBreak ? strings.timer.breakPhase : strings.timer.focusPhase}
          </span>
          <span className="mini-art-time" {...drag}>{formatClock(remaining)}</span>
          <span className="mini-art-sub" {...drag}>
            {formatClock(total - remaining)} / {formatClock(total)}
          </span>
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
                  aria-label={strings.actions.openApp}
                  title={strings.actions.openApp}
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

          {/* Large layout only: the space above the timeline becomes tiles. */}
          <div className="mini-cards" {...drag}>
            <div className="mini-tile mini-tile--progress" {...drag}>
              <span className="mini-tile-label" {...drag}>{strings.mini.progress}</span>
              <span className="mini-tile-value" {...drag}>{Math.round(pct)}%</span>
              <span className="mini-tile-bar" {...drag}>
                <span style={{ width: `${pct}%` }} />
              </span>
            </div>
            <div className="mini-tile" {...drag}>
              <span className="mini-tile-label" {...drag}>{strings.mini.upNext}</span>
              <span className="mini-tile-value" {...drag}>{formatClock(snapshot.nextPhaseSeconds)}</span>
              <span className="mini-tile-meta" {...drag}>{nextLabel}</span>
            </div>
            <div className="mini-tile" {...drag}>
              <span className="mini-tile-label" {...drag}>{strings.mini.doneToday}</span>
              <span className="mini-tile-value" {...drag}>{snapshot.completedToday}</span>
              <span className="mini-tile-meta" {...drag}>{strings.timer.sessionsTitle}</span>
            </div>
            <div className="mini-tile mini-tile--tasks" {...drag}>
              <span className="mini-tile-label" {...drag}>{strings.mini.nextTasks}</span>
              {snapshot.upNextTasks?.length ? (
                <ul className="mini-task-list" {...drag}>
                  {snapshot.upNextTasks.map((t, i) => (
                    <li key={i} title={t} {...drag}>{t}</li>
                  ))}
                </ul>
              ) : (
                <span className="mini-tile-meta" {...drag}>{strings.mini.noNextTasks}</span>
              )}
            </div>
          </div>

          <div className="mini-scrubber" {...drag}>
            <Scrubber value={pct} label={strings.timer.sessionProgress} />
          </div>

          <div className="mini-bottom" {...drag}>
            <span className="mini-time-small" {...drag}>{formatClock(total - remaining)}</span>
            <div className="mini-controls">
              <button type="button" className="mini-ctrl" onClick={() => onCommand('reset')} aria-label={strings.actions.resetTimer} title={strings.actions.resetTimer}>
                <IconReset size={16} />
              </button>
              <button
                type="button"
                className="mini-ctrl mini-ctrl--play"
                onClick={() => onCommand('toggle')}
                aria-label={running ? strings.timer.pauseTooltip : strings.timer.playTooltip}
                title={running ? strings.timer.pauseTooltip : strings.timer.playTooltip}
              >
                <IconSwap on={running} onIcon={<IconPause size={16} />} offIcon={<IconPlay size={16} />} />
              </button>
              <button type="button" className="mini-ctrl" onClick={() => onCommand('skip')} aria-label={strings.timer.skipTooltip} title={strings.timer.skipTooltip}>
                <IconSkip size={15} />
              </button>
            </div>
            <span className="mini-time-small" {...drag}>{formatClock(total)}</span>
          </div>
        </div>
      </div>
      {menu.element}
    </div>
  );
};
