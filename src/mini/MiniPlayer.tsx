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
import { PlayerControl } from '../components/ui/PlayerControl';
import { WindowButton } from '../components/ui/WindowButton';
import { ProgressRing } from '../components/ui/ProgressRing';
import { useContextMenuState } from '../components/ui/ContextMenu';
import { MenuItem } from '../components/ui/Menu';
import { Scrubber } from '../components/timer/Scrubber';
import { TIMING } from '../constants/timing';
import { MiniTaskList } from './MiniTaskList';

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
          <WindowButton size="sm" className="mini-close-solo" onClick={controls.onClose} label={strings.mini.close}>
            <IconClose size={14} strokeWidth={2.4} />
          </WindowButton>
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
          <ProgressRing className="mini-ring" value={pct / 100} box={100} radius={46} />
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
                <WindowButton
                  size="sm"
                  pressed={!!controls.pinned}
                  onClick={controls.onTogglePin}
                  label={controls.pinned ? strings.mini.unpin : strings.mini.pin}
                >
                  <IconPin size={14} />
                </WindowButton>
              )}
              {controls.onToggleAlwaysOnTop && (
                <WindowButton
                  size="sm"
                  pressed={!!controls.alwaysOnTop}
                  onClick={controls.onToggleAlwaysOnTop}
                  label={controls.alwaysOnTop ? strings.mini.alwaysOnTopOn : strings.mini.alwaysOnTopOff}
                >
                  <IconLayers size={14} />
                </WindowButton>
              )}
              {controls.onExpand && (
                <WindowButton size="sm" onClick={controls.onExpand} label={strings.actions.openApp}>
                  <IconExpand size={13} />
                </WindowButton>
              )}
              <WindowButton size="sm" onClick={controls.onClose} label={strings.mini.close}>
                <IconClose size={14} strokeWidth={2.4} />
              </WindowButton>
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
              <span className="mini-tile-label" {...drag}>{strings.timer.sessionTasksTitle}</span>
              {snapshot.taskLists?.length ? (
                // Not a drag region: the rows and the add field need their clicks and drags.
                <MiniTaskList tasks={snapshot.tasks} lists={snapshot.taskLists} onCommand={onCommand} openMenu={menu.openMenu} />
              ) : (
                <span className="mini-tile-meta" {...drag}>{strings.mini.noSessionLists}</span>
              )}
            </div>
          </div>

          <div className="mini-scrubber" {...drag}>
            <Scrubber value={pct} label={strings.timer.sessionProgress} />
          </div>

          <div className="mini-bottom" {...drag}>
            <span className="mini-time-small" {...drag}>{formatClock(total - remaining)}</span>
            <div className="mini-controls">
              <PlayerControl size="sm" onClick={() => onCommand('reset')} label={strings.actions.resetTimer}>
                <IconReset size={16} />
              </PlayerControl>
              <PlayerControl
                size="sm"
                variant="primary"
                onClick={() => onCommand('toggle')}
                label={running ? strings.timer.pauseTooltip : strings.timer.playTooltip}
              >
                <IconSwap on={running} onIcon={<IconPause size={16} />} offIcon={<IconPlay size={16} />} />
              </PlayerControl>
              <PlayerControl size="sm" onClick={() => onCommand('skip')} label={strings.timer.skipTooltip}>
                <IconSkip size={15} />
              </PlayerControl>
            </div>
            <span className="mini-time-small" {...drag}>{formatClock(total)}</span>
          </div>
        </div>
      </div>
      {menu.element}
    </div>
  );
};
