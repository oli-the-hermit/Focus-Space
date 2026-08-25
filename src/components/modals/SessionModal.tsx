import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Session } from '../../types';
import { strings } from '../../constants/strings';

export interface SessionModalProps {
  session?: Session | null;
  onClose: () => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ session, onClose }) => {
  const { state, createSession, updateSession } = useApp();

  const [name, setName] = useState(session ? session.name : '');
  const [focusMinutes, setFocusMinutes] = useState(session ? session.focusMinutes : 25);
  const [breakMinutes, setBreakMinutes] = useState(session ? session.breakMinutes : 5);

  const initialRewardId = () => {
    if (session?.rewardId) return session.rewardId;
    if (session?.id) {
      const linked = state.rewards.find(
        r => r.linkedSessionId === session.id || (r.trigger === 'session' && r.linkedId === session.id)
      );
      if (linked) return linked.id;
    }
    return '';
  };

  const [rewardId, setRewardId] = useState<string>(initialRewardId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || strings.modals.untitledSession;
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
        <label className="form-label">{strings.modals.sessionNameLabel}</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.sessionNamePlaceholder}
          autoFocus
        />
      </div>

      <div className="form-row form-group-spaced">
        <div className="form-group">
          <label className="form-label">{strings.modals.focusTimeLabel}</label>
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
          <label className="form-label">{strings.modals.breakTimeLabel}</label>
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

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.rewards.rewardOnCompletion}</label>
        <select
          className="form-select"
          value={rewardId}
          onChange={e => setRewardId(e.target.value)}
        >
          <option value="">{strings.rewards.noReward}</option>
          {state.rewards.map(r => (
            <option key={r.id} value={r.id}>
              {r.emoji || r.icon ? `${r.emoji || r.icon} ` : ''}{r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions modal-form-actions">
        <button type="button" className="btn-action" onClick={onClose}>
          {strings.common.cancel}
        </button>
        <button type="submit" className="btn-action primary">
          {session ? strings.common.saveChanges : strings.modals.createSessionBtn}
        </button>
      </div>
    </form>
  );
};
