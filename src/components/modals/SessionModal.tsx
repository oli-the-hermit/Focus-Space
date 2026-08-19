import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';

export interface SessionModalProps {
  session?: Session | null;
  onClose: () => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ session, onClose }) => {
  const { state, createSession, updateSession } = useApp();

  const [name, setName] = useState(session ? session.name : '');
  const [focusMinutes, setFocusMinutes] = useState(session ? session.focusMinutes : 25);
  const [breakMinutes, setBreakMinutes] = useState(session ? session.breakMinutes : 5);
  const [rewardId, setRewardId] = useState<string>(session?.rewardId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Untitled Session';
    const focus = Math.max(1, Number(focusMinutes) || 25);
    const brk = Math.max(1, Number(breakMinutes) || 5);
    const finalReward = rewardId || null;

    if (session) {
      updateSession(session.id, {
        name: finalName,
        focusMinutes: focus,
        breakMinutes: brk,
        rewardId: finalReward
      });
    } else {
      createSession({
        name: finalName,
        focusMinutes: focus,
        breakMinutes: brk,
        rewardId: finalReward
      });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Session Name</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Deep Work"
          autoFocus
        />
      </div>

      <div className="form-row" style={{ marginTop: '12px' }}>
        <div className="form-group">
          <label className="form-label">Focus Time (minutes)</label>
          <input
            type="number"
            className="form-input"
            value={focusMinutes}
            onChange={e => setFocusMinutes(Number(e.target.value))}
            min={1}
            max={240}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Break Time (minutes)</label>
          <input
            type="number"
            className="form-input"
            value={breakMinutes}
            onChange={e => setBreakMinutes(Number(e.target.value))}
            min={1}
            max={120}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label">Reward on Completion (optional)</label>
        <select
          className="form-select"
          value={rewardId}
          onChange={e => setRewardId(e.target.value)}
        >
          <option value="">— No reward —</option>
          {state.rewards.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions" style={{ marginTop: '20px' }}>
        <button type="button" className="btn-action" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-action primary">
          {session ? 'Save Changes' : 'Create Session'}
        </button>
      </div>
    </form>
  );
};
