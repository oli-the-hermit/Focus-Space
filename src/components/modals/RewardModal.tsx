import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Reward, RewardTrigger, GoalFrequency } from '../../types';

export interface RewardModalProps {
  reward?: Reward | null;
  onClose: () => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  session: 'Session',
  landmark: 'Landmark',
  goal: 'Goal',
  manual: 'Manual'
};

const FREQUENCY_OPTIONS: GoalFrequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

export const RewardModal: React.FC<RewardModalProps> = ({ reward, onClose }) => {
  const { state, addReward, updateReward } = useApp();

  const [name, setName] = useState(reward ? reward.name : '');
  const [description, setDescription] = useState(reward ? (reward.description || reward.desc || '') : '');
  const [emoji, setEmoji] = useState(reward ? (reward.emoji || reward.icon || '🎁') : '🎁');
  const [frequency, setFrequency] = useState<GoalFrequency>(
    reward ? (reward.frequency || reward.type || 'daily') : 'daily'
  );
  const [trigger, setTrigger] = useState<RewardTrigger>(reward ? reward.trigger : 'manual');
  const [linkedId, setLinkedId] = useState<string>(reward?.linkedId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'My Reward';
    const finalEmoji = emoji.trim() || '🎁';
    const finalLinkedId = trigger !== 'manual' ? (linkedId || null) : null;
    const finalStatus = trigger === 'manual' ? 'ready' : (reward ? reward.status : 'locked');

    if (reward) {
      updateReward(reward.id, {
        name: finalName,
        description: description.trim(),
        desc: description.trim(),
        emoji: finalEmoji,
        icon: finalEmoji,
        frequency,
        type: frequency,
        trigger,
        linkedId: finalLinkedId,
        status: finalStatus
      });
    } else {
      addReward({
        name: finalName,
        description: description.trim(),
        desc: description.trim(),
        emoji: finalEmoji,
        icon: finalEmoji,
        frequency,
        type: frequency,
        trigger,
        linkedId: finalLinkedId,
        status: finalStatus,
        claimedAt: null
      });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Reward Name</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Coffee break ☕"
          autoFocus
        />
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label">Description (optional)</label>
        <textarea
          className="form-input form-textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this reward?"
          rows={2}
        />
      </div>

      <div className="form-row" style={{ marginTop: '12px' }}>
        <div className="form-group">
          <label className="form-label">Emoji / Icon</label>
          <input
            type="text"
            className="form-input"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="🎁"
            maxLength={4}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Frequency / Period</label>
          <select
            className="form-select"
            value={frequency}
            onChange={e => setFrequency(e.target.value as GoalFrequency)}
          >
            {FREQUENCY_OPTIONS.map(f => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label">Trigger Type</label>
        <select
          className="form-select"
          value={trigger}
          onChange={e => setTrigger(e.target.value as RewardTrigger)}
        >
          {['session', 'landmark', 'goal', 'manual'].map(t => (
            <option key={t} value={t}>
              {TRIGGER_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {trigger !== 'manual' && (
        <div className="form-group" style={{ marginTop: '12px' }}>
          <label className="form-label">Linked to</label>
          <select
            className="form-select"
            value={linkedId}
            onChange={e => setLinkedId(e.target.value)}
          >
            <option value="">— Select linked item —</option>

            {trigger === 'session' && (
              <optgroup label="Sessions">
                {state.sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}

            {trigger === 'goal' && (
              <optgroup label="Goals">
                {state.goals.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name || g.title}
                  </option>
                ))}
              </optgroup>
            )}

            {trigger === 'landmark' && (
              <optgroup label="Landmarks">
                {state.goals.flatMap(g =>
                  (g.landmarks || []).map(l => (
                    <option key={l.id} value={l.id}>
                      [{g.name || g.title}] {l.name || l.text}
                    </option>
                  ))
                )}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: '20px' }}>
        <button type="button" className="btn-action" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-action primary">
          {reward ? 'Save Changes' : 'Create Reward'}
        </button>
      </div>
    </form>
  );
};
