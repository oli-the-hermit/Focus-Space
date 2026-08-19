import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Goal, GoalFrequency } from '../../types';

export interface GoalModalProps {
  goal?: Goal | null;
  onClose: () => void;
}

const GOAL_TYPES: GoalFrequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

export const GoalModal: React.FC<GoalModalProps> = ({ goal, onClose }) => {
  const { state, addGoal, updateGoal } = useApp();

  const [name, setName] = useState(goal ? (goal.name || goal.title || '') : '');
  const [type, setType] = useState<GoalFrequency>(goal ? (goal.type || goal.frequency || 'daily') : 'daily');
  const [rewardId, setRewardId] = useState<string>(goal?.rewardId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Untitled Goal';
    const finalReward = rewardId || null;

    if (goal) {
      updateGoal(goal.id, {
        name: finalName,
        title: finalName,
        type,
        frequency: type,
        rewardId: finalReward
      });
    } else {
      addGoal({
        name: finalName,
        title: finalName,
        type,
        frequency: type,
        rewardId: finalReward,
        landmarks: []
      });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Goal Name</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Read 10 books"
          autoFocus
        />
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label">Frequency</label>
        <select
          className="form-select"
          value={type}
          onChange={e => setType(e.target.value as GoalFrequency)}
        >
          {GOAL_TYPES.map(t => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
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
          {goal ? 'Save Changes' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
};
