import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { Landmark } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { DateRangeFields, isDateRangeInvalid } from './DateRangeFields';

export interface LandmarkModalProps {
  goalId: string;
  landmark?: Landmark | null;
  onClose: () => void;
}

export const LandmarkModal: React.FC<LandmarkModalProps> = ({ goalId, landmark, onClose }) => {
  const { state, addLandmark, updateLandmark } = useApp();

  const [name, setName] = useState(landmark ? (landmark.name || landmark.text || '') : '');
  const [rewardId, setRewardId] = useState<string>(landmark?.rewardId || '');
  const [startDate, setStartDate] = useState(landmark?.startDate || '');
  const [dueDate, setDueDate] = useState(landmark?.dueDate || '');
  const datesInvalid = isDateRangeInvalid(startDate, dueDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (datesInvalid) return;
    const finalName = name.trim() || strings.goals.untitledLandmark;
    const finalReward = rewardId || null;
    const dates = { startDate: startDate || null, dueDate: dueDate || null };

    if (landmark) {
      updateLandmark(goalId, landmark.id, {
        name: finalName,
        text: finalName,
        rewardId: finalReward,
        ...dates
      });
    } else {
      addLandmark(goalId, {
        name: finalName,
        text: finalName,
        completed: false,
        rewardId: finalReward,
        ...dates
      });
    }
    onClose();
  };

  const dirty = useDirty([name, rewardId, startDate, dueDate]);

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-group">
        <label className="form-label" htmlFor="landmarkName">{strings.modals.landmarkNameLabel}</label>
        <input
          id="landmarkName"
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.landmarkNamePlaceholder}
          autoFocus
        />
      </div>

      <DateRangeFields
        idPrefix="landmark"
        startDate={startDate}
        dueDate={dueDate}
        onStartChange={setStartDate}
        onDueChange={setDueDate}
      />

      <div className="form-group">
        <span className="form-label">{strings.rewards.rewardOnCompletion}</span>
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
              icon: <span className="emoji-glyph">{r.emoji || r.icon || '🎁'}</span>
            }))
          ]}
        />
      </div>

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryDisabled={datesInvalid}
        primaryLabel={landmark ? strings.common.save : strings.modals.addLandmarkBtn}
      />
    </form>
  );
};
