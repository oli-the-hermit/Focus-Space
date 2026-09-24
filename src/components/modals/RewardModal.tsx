import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Reward, RewardTrigger, GoalFrequency } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';

export interface RewardModalProps {
  reward?: Reward | null;
  onClose: () => void;
}

const FREQUENCY_OPTIONS: GoalFrequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

export const RewardModal: React.FC<RewardModalProps> = ({ reward, onClose }) => {
  const { state, addReward, updateReward, createSession } = useApp();

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
    <form onSubmit={handleSubmit} className="modal-form">
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
            className="form-input emoji-input"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="🎁"
            maxLength={4}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{strings.modals.frequencyPeriodLabel}</label>
          <Select
            value={frequency}
            onChange={val => setFrequency(val as GoalFrequency)}
            options={FREQUENCY_OPTIONS.map(f => ({
              value: f,
              label: f.charAt(0).toUpperCase() + f.slice(1)
            }))}
          />
        </div>
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.rewards.linkSessionLabel}</label>
        <Select
          value={linkedSessionId}
          onChange={val => setLinkedSessionId(val)}
          placeholder={strings.rewards.noSessionLinked}
          ariaLabel={strings.rewards.linkSessionLabel}
          options={[
            { value: '', label: strings.rewards.noSessionLinked },
            ...state.sessions.map(s => ({
              value: s.id,
              label: s.name,
              meta: `${s.focusMinutes}m`
            }))
          ]}
          createOption={{
            label: strings.modals.newSessionOption,
            placeholder: strings.modals.newSessionPlaceholder,
            onCreate: sessionName => {
              const newId = createSession({ name: sessionName, focusMinutes: 25, breakMinutes: 5, rewardId: null });
              setLinkedSessionId(newId);
            }
          }}
        />
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.rewards.linkGoalLabel}</label>
        <Select
          value={linkedGoalId}
          onChange={val => setLinkedGoalId(val)}
          placeholder={strings.rewards.noGoalLinked}
          options={[
            { value: '', label: strings.rewards.noGoalLinked },
            ...state.goals.map(g => ({
              value: g.id,
              label: g.name || g.title
            }))
          ]}
        />
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
