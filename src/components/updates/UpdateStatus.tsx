import React from 'react';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import type { UpdateState } from '../../lib/updates';
import { ProgressBar } from '../ui/ProgressBar';

/** The line that says where an update is (checking, progress, result), or null when there's nothing to say. */
export function updateMessage(state: UpdateState): string | null {
  const u = strings.updates;
  switch (state.phase) {
    case 'checking':
      return u.checking;
    case 'upToDate':
      return format(u.upToDate, { version: state.current });
    case 'downloading':
      return state.progress === null ? u.downloadingNoSize : format(u.downloading, { percent: Math.round(state.progress * 100) });
    case 'restarting':
      return u.restarting;
    case 'failed':
      return state.step === 'check' ? u.checkFailed : u.installFailed;
    default:
      return null;
  }
}

/** Status text plus a progress bar while downloading. Shared by the launch card and Settings. */
export const UpdateStatus: React.FC<{ state: UpdateState; className?: string }> = ({ state, className }) => {
  const message = updateMessage(state);
  if (!message) return null;
  return (
    <div className={className} role="status" aria-live="polite">
      <p className="update-status-text">{message}</p>
      {state.phase === 'downloading' && (
        <ProgressBar value={(state.progress ?? 0) * 100} label={strings.updates.downloadingNoSize} />
      )}
    </div>
  );
};
