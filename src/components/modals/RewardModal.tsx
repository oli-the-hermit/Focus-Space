import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Reward, RewardTrigger, GoalFrequency } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { Field, TextArea, TextInput } from '../ui/Field';
import { FREQUENCY_OPTIONS } from '../../constants/frequencies';
import { DEFAULT_REWARD_EMOJI } from '../../constants/defaults';

export interface RewardModalProps {
  reward?: Reward | null;
  onClose: () => void;
}


export const RewardModal: React.FC<RewardModalProps> = ({ reward, onClose }) => {
  const { state, addReward, updateReward, createSession } = useApp();

  const [name, setName] = useState(reward ? reward.name : '');
  const [description, setDescription] = useState(reward ? (reward.description || '') : '');
  const [emoji, setEmoji] = useState(reward ? (reward.emoji) : DEFAULT_REWARD_EMOJI);
  const [frequency, setFrequency] = useState<GoalFrequency>(
    reward ? reward.frequency : 'daily'
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
    const finalEmoji = emoji.trim() || DEFAULT_REWARD_EMOJI;
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
        emoji: finalEmoji,
        frequency,
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
        emoji: finalEmoji,
        frequency,
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

  const dirty = useDirty([name, description, emoji, frequency, linkedSessionId, linkedGoalId]);

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <Field label={strings.modals.rewardNameLabel}>
        <TextInput
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.rewardNamePlaceholder}
          autoFocus
        />
      </Field>

      <Field label={strings.modals.descriptionLabel} spaced>
        <TextArea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={strings.modals.descriptionPlaceholder}
          rows={2}
        />
      </Field>

      <div className="form-row form-group-spaced">
        <Field label={strings.modals.emojiLabel}>
          <TextInput
            className="emoji-input"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder={DEFAULT_REWARD_EMOJI}
            maxLength={4}
          />
        </Field>
        <Field label={strings.modals.frequencyPeriodLabel}>
          <Select
            value={frequency}
            onChange={val => setFrequency(val as GoalFrequency)}
            options={FREQUENCY_OPTIONS}
          />
        </Field>
      </div>

      <Field label={strings.rewards.linkSessionLabel} spaced>
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
      </Field>

      <Field label={strings.rewards.linkGoalLabel} spaced>
        <Select
          value={linkedGoalId}
          onChange={val => setLinkedGoalId(val)}
          placeholder={strings.rewards.noGoalLinked}
          options={[
            { value: '', label: strings.rewards.noGoalLinked },
            ...state.goals.map(g => ({
              value: g.id,
              label: g.name
            }))
          ]}
        />
      </Field>

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryLabel={reward ? strings.common.saveChanges : strings.modals.createRewardBtn}
      />
    </form>
  );
};
