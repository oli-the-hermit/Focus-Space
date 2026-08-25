import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Landmark } from '../../types';
import { strings } from '../../constants/strings';

export interface LandmarkModalProps {
  goalId: string;
  landmark?: Landmark | null;
  onClose: () => void;
}

export const LandmarkModal: React.FC<LandmarkModalProps> = ({ goalId, landmark, onClose }) => {
  const { state, addLandmark, updateLandmark } = useApp();

  const [name, setName] = useState(landmark ? (landmark.name || landmark.text || '') : '');
  const [rewardId, setRewardId] = useState<string>(landmark?.rewardId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || strings.goals.untitledLandmark;
    const finalReward = rewardId || null;

    if (landmark) {
      updateLandmark(goalId, landmark.id, {
        name: finalName,
        text: finalName,
        rewardId: finalReward
      });
    } else {
      addLandmark(goalId, {
        name: finalName,
        text: finalName,
        completed: false,
        rewardId: finalReward
      });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">{strings.modals.landmarkNameLabel}</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={strings.modals.landmarkNamePlaceholder}
          autoFocus
        />
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
          {landmark ? strings.common.save : strings.modals.addLandmarkBtn}
        </button>
      </div>
    </form>
  );
};
