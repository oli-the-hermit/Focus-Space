import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Goal, GoalFrequency } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { DateRangeFields, isDateRangeInvalid } from './DateRangeFields';
import { Field, TextInput } from '../ui/Field';
import { FREQUENCY_OPTIONS } from '../../constants/frequencies';

export interface GoalModalProps {
  goal?: Goal | null;
  onClose: () => void;
}


export const GoalModal: React.FC<GoalModalProps> = ({ goal, onClose }) => {
  const { state, addGoal, updateGoal } = useApp();

  const [name, setName] = useState(goal ? (goal.name || '') : '');
  const [type, setType] = useState<GoalFrequency>(goal ? (goal.frequency) : 'daily');
  const [startDate, setStartDate] = useState(goal?.startDate || '');
  const [dueDate, setDueDate] = useState(goal?.dueDate || '');

  const initialRewardId = () => {
    if (goal?.rewardId) return goal.rewardId;
    if (goal?.id) {
      const linked = state.rewards.find(
        r => r.linkedGoalId === goal.id || (r.trigger === 'goal' && r.linkedId === goal.id)
      );
      if (linked) return linked.id;
    }
    return '';
  };

  const [rewardId, setRewardId] = useState<string>(initialRewardId);
  const datesInvalid = isDateRangeInvalid(startDate, dueDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (datesInvalid) return;
    const finalName = name.trim() || strings.goals.untitledGoal;
    const finalReward = rewardId || null;
    const dates = { startDate: startDate || null, dueDate: dueDate || null };

    if (goal) {
      updateGoal(goal.id, {
        name: finalName,
        frequency: type,
        rewardId: finalReward,
        ...dates
      });
    } else {
      addGoal({
        name: finalName,
        frequency: type,
        rewardId: finalReward,
        landmarks: [],
        ...dates
      });
    }
    onClose();
  };

  const dirty = useDirty([name, type, startDate, dueDate, rewardId]);

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <Field label={strings.modals.goalNameLabel} htmlFor="goalName">
        <TextInput
          id="goalName"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.goalNamePlaceholder}
          autoFocus
        />
      </Field>

      <Field label={strings.modals.frequencyLabel} group>
        <Select
          value={type}
          onChange={val => setType(val as GoalFrequency)}
          ariaLabel={strings.modals.frequencyLabel}
          options={FREQUENCY_OPTIONS}
        />
      </Field>

      <DateRangeFields
        idPrefix="goal"
        startDate={startDate}
        dueDate={dueDate}
        onStartChange={setStartDate}
        onDueChange={setDueDate}
      />

      <Field label={strings.rewards.rewardOnCompletion} group>
        <Select
          value={rewardId}
          onChange={val => setRewardId(val)}
          placeholder={strings.rewards.noReward}
          ariaLabel={strings.rewards.rewardOnCompletion}
          options={[
            { value: '', label: strings.rewards.noReward },
            ...state.rewards.map(r => ({
              value: r.id,
              label: r.name,
              icon: <span className="emoji-glyph">{r.emoji}</span>
            }))
          ]}
        />
      </Field>

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryDisabled={datesInvalid}
        primaryLabel={goal ? strings.common.saveChanges : strings.modals.createGoalBtn}
      />
    </form>
  );
};
