import React from 'react';
import { Goal } from '../../types';
import { useApp } from '../../context/AppContext';

export interface GoalCardProps {
  goal: Goal;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const {
    state,
    openModal,
    duplicateGoal,
    deleteGoal,
    toggleGoal,
    toggleLandmark,
    duplicateLandmark,
    deleteLandmark
  } = useApp();

  const goalName = goal.name || goal.title || 'Untitled Goal';
  const goalType = goal.type || goal.frequency || 'daily';
  const landmarks = goal.landmarks || [];
  const hasLandmarks = landmarks.length > 0;

  const totalLandmarks = landmarks.length;
  const doneLandmarks = landmarks.filter(l => l.completed).length;
  const pct = hasLandmarks
    ? (totalLandmarks > 0 ? Math.round((doneLandmarks / totalLandmarks) * 100) : 0)
    : (goal.completed ? 100 : 0);
  const isComplete = pct === 100;

  const linkedReward = goal.rewardId ? state.rewards.find(r => r.id === goal.rewardId) : null;

  const handleEditGoal = () => {
    openModal('EDIT_GOAL', { goal });
  };

  const handleDeleteGoal = () => {
    openModal('CONFIRM_DELETE', {
      title: 'Delete Goal',
      message: `Delete goal "${goalName}"?`,
      confirmLabel: 'Delete Goal',
      onConfirm: () => deleteGoal(goal.id)
    });
  };

  const handleAddLandmark = () => {
    openModal('NEW_LANDMARK', { goalId: goal.id });
  };

  const handleEditLandmark = (lm: any) => {
    openModal('EDIT_LANDMARK', { goalId: goal.id, landmark: lm });
  };

  const handleDeleteLandmark = (lmId: string) => {
    deleteLandmark(goal.id, lmId);
  };

  return (
    <div className="goal-card" data-gid={goal.id}>
      <div className="goal-card-header">
        <div className="goal-card-header-info">
          <div className="goal-card-title">{goalName}</div>
          <div className="goal-card-meta">
            <span className={`goal-type-badge badge-${goalType}`}>
              {goalType.charAt(0).toUpperCase() + goalType.slice(1)}
            </span>
            {linkedReward && (
              <span className="goal-reward-badge">🎁 {linkedReward.name}</span>
            )}
          </div>
        </div>
        <div className="goal-card-actions">
          <button className="icon-btn xs" onClick={handleEditGoal} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="icon-btn xs" onClick={() => duplicateGoal(goal.id)} title="Duplicate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button className="icon-btn xs danger" onClick={handleDeleteGoal} title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>

      {hasLandmarks && (
        <div className="goal-card-progress">
          <div className="goal-progress-row">
            <span>{doneLandmarks} of {totalLandmarks} landmarks</span>
            <span>{pct}%</span>
          </div>
          <div className="goal-progress-track">
            <div
              className={`goal-progress-fill ${isComplete ? 'complete' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {hasLandmarks && (
        <div className="goal-landmarks">
          <div className="landmarks-title">Landmarks</div>
          {landmarks.map(lm => {
            const lmName = lm.name || lm.text || 'Untitled Landmark';
            const lmReward = lm.rewardId ? state.rewards.find(r => r.id === lm.rewardId) : null;

            return (
              <div
                key={lm.id}
                className={`landmark-item ${lm.completed ? 'landmark-done' : ''}`}
                data-lmid={lm.id}
              >
                <input
                  type="checkbox"
                  className="landmark-check"
                  checked={lm.completed}
                  onChange={() => toggleLandmark(goal.id, lm.id)}
                />
                <span className="landmark-text">{lmName}</span>
                {lmReward && <span className="landmark-reward-tag">🎁 {lmReward.name}</span>}
                <div className="landmark-actions">
                  <button className="icon-btn xs" onClick={() => handleEditLandmark(lm)} title="Edit">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="icon-btn xs" onClick={() => duplicateLandmark(goal.id, lm.id)} title="Duplicate">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button className="icon-btn xs danger" onClick={() => handleDeleteLandmark(lm.id)} title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="goal-card-footer">
        {!hasLandmarks ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="task-check"
              style={{ width: '16px', height: '16px' }}
              checked={goal.completed}
              onChange={() => toggleGoal(goal.id)}
            />
            Mark as complete
          </label>
        ) : (
          <div />
        )}
        <button className="add-landmark-btn" onClick={handleAddLandmark}>
          + Add Landmark
        </button>
      </div>
    </div>
  );
};
