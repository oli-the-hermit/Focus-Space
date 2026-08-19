import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Landmark } from '../../types';

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
    const finalName = name.trim() || 'Untitled Landmark';
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
        <label className="form-label">Landmark Name</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Finish chapter 3"
          autoFocus
        />
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
          {landmark ? 'Save' : 'Add Landmark'}
        </button>
      </div>
    </form>
  );
};
