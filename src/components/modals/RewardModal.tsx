import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Reward, GoalFrequency } from '../../types';
import { rewardLinks } from '../../lib/rewardLinks';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { Field, TextArea, TextInput } from '../ui/Field';
import { FormRow, ModalForm } from '../ui/FormLayout';
import { FREQUENCY_OPTIONS } from '../../constants/frequencies';
import { DEFAULT_BREAK_MINUTES, DEFAULT_FOCUS_MINUTES, DEFAULT_REWARD_EMOJI } from '../../constants/defaults';
import { RewardEmojiField } from '../rewards/RewardEmojiField';

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

  const [initialLinks] = useState(() => (reward ? rewardLinks(state, reward.id) : null));
  const [linkedSessionId, setLinkedSessionId] = useState<string>(initialLinks?.sessionId ?? '');
  const [linkedGoalId, setLinkedGoalId] = useState<string>(initialLinks?.goalId ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || strings.rewards.untitledReward;
    const finalEmoji = emoji.trim() || DEFAULT_REWARD_EMOJI;
    const links = { sessionId: linkedSessionId || null, goalId: linkedGoalId || null };
    // Landmarks link rewards from the goal card, so they count even though this form doesn't show them.
    const manual = !links.sessionId && !links.goalId && !initialLinks?.landmarkIds.length;
    const finalStatus = manual ? 'ready' : (reward ? reward.status : 'locked');
    const fields = { name: finalName, description: description.trim(), emoji: finalEmoji, frequency, status: finalStatus };

    if (reward) updateReward(reward.id, fields, links);
    else addReward({ ...fields, claimedAt: null }, links);
    onClose();
  };

  const dirty = useDirty([name, description, emoji, frequency, linkedSessionId, linkedGoalId]);

  return (
    <ModalForm onSubmit={handleSubmit}>
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

      <FormRow spaced>
        <Field label={strings.modals.emojiLabel} htmlFor="rewardEmoji">
          <RewardEmojiField id="rewardEmoji" value={emoji} onChange={setEmoji} />
        </Field>
        <Field label={strings.modals.frequencyPeriodLabel}>
          <Select
            value={frequency}
            onChange={val => setFrequency(val as GoalFrequency)}
            options={FREQUENCY_OPTIONS}
          />
        </Field>
      </FormRow>

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
              const newId = createSession({ name: sessionName, focusMinutes: DEFAULT_FOCUS_MINUTES, breakMinutes: DEFAULT_BREAK_MINUTES, rewardId: null });
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
    </ModalForm>
  );
};
