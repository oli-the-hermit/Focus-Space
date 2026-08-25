import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Reward, RewardTrigger, GoalFrequency } from '../../types';
import { strings } from '../../constants/strings';

export interface RewardModalProps {
  reward?: Reward | null;
  onClose: () => void;
}

const FREQUENCY_OPTIONS: GoalFrequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

export const RewardModal: React.FC<RewardModalProps> = ({ reward, onClose }) => {
  const { state, addReward, updateReward } = useApp();

  const [name, setName] = useState(reward ? reward.name : '');
  const [description, setDescription] = useState(reward ? (reward.description || reward.desc || '') : '');
  const [emoji, setEmoji] = useState(reward ? (reward.emoji || reward.icon || '🎁') : '🎁');
  const [frequency, setFrequency] = useState<GoalFrequency>(
    reward ? (reward.frequency || reward.type || 'daily') : 'daily'
  );

  const initialSessionId = () => {
    if (!reward) return '';
    if (reward.linkedSessionId) return reward.linkedSessionId;
    if (reward.trigger === 'session' && reward.linkedId) return reward.linkedId;
    const matched = state.sessions.find(s => s.rewardId === reward.id);
    return matched ? matched.id : '';
  };

  const initialGoalId = () => {
    if (!reward) return '';
    if (reward.linkedGoalId) return reward.linkedGoalId;
    if (reward.trigger === 'goal' && reward.linkedId) return reward.linkedId;
    const matched = state.goals.find(g => g.rewardId === reward.id);
    return matched ? matched.id : '';
  };

  const [linkedSessionId, setLinkedSessionId] = useState<string>(initialSessionId);
  const [linkedGoalId, setLinkedGoalId] = useState<string>(initialGoalId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || strings.rewards.untitledReward;
    const finalEmoji = emoji.trim() || '🎁';
    const finalSessionId = linkedSessionId || null;
    const finalGoalId = linkedGoalId || null;

    let inferredTrigger: RewardTrigger = 'manual';
    if (finalSessionId) inferredTrigger = 'session';
    else if (finalGoalId) inferredTrigger = 'goal';
    else if (reward?.trigger === 'landmark') inferredTrigger = 'landmark';

    const finalStatus = (!finalSessionId && !finalGoalId && inferredTrigger === 'manual')
      ? 'ready'
      : (reward ? reward.status : 'locked');

    if (reward) {
      updateReward(reward.id, {
        name: finalName,
        description: description.trim(),
        desc: description.trim(),
        emoji: finalEmoji,
        icon: finalEmoji,
        frequency,
        type: frequency,
        trigger: inferredTrigger,
        linkedSessionId: finalSessionId,
        linkedGoalId: finalGoalId,
        linkedId: finalSessionId || finalGoalId || (reward.trigger === 'landmark' ? reward.linkedId : null),
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
        trigger: inferredTrigger,
        linkedSessionId: finalSessionId,
        linkedGoalId: finalGoalId,
        linkedId: finalSessionId || finalGoalId || null,
        status: finalStatus,
        claimedAt: null
      });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">{strings.modals.rewardNameLabel}</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.rewardNamePlaceholder}
          autoFocus
        />
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.modals.descriptionLabel}</label>
        <textarea
          className="form-input form-textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={strings.modals.descriptionPlaceholder}
          rows={2}
        />
      </div>

      <div className="form-row form-group-spaced">
        <div className="form-group">
          <label className="form-label">{strings.modals.emojiLabel}</label>
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
          <label className="form-label">{strings.modals.frequencyPeriodLabel}</label>
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

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.rewards.linkSessionLabel}</label>
        <select
          className="form-select"
          value={linkedSessionId}
          onChange={e => setLinkedSessionId(e.target.value)}
        >
          <option value="">{strings.rewards.noSessionLinked}</option>
          {state.sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.focusMinutes}m)
            </option>
          ))}
        </select>
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.rewards.linkGoalLabel}</label>
        <select
          className="form-select"
          value={linkedGoalId}
          onChange={e => setLinkedGoalId(e.target.value)}
        >
          <option value="">{strings.rewards.noGoalLinked}</option>
          {state.goals.map(g => (
            <option key={g.id} value={g.id}>
              {g.name || g.title}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions modal-form-actions">
        <button type="button" className="btn-action" onClick={onClose}>
          {strings.common.cancel}
        </button>
        <button type="submit" className="btn-action primary">
          {reward ? strings.common.saveChanges : strings.modals.createRewardBtn}
        </button>
      </div>
    </form>
  );
};
