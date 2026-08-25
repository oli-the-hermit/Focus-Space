import React from 'react';
import { Goal, Landmark } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconTrash } from '../ui/icons';

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

  const goalName = goal.name || goal.title || strings.goals.untitledGoal;
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
      title: `${strings.common.delete} ${strings.tabs.goals}`,
      message: `${strings.common.delete} "${goalName}"?`,
      confirmLabel: `${strings.common.delete} ${strings.tabs.goals}`,
      onConfirm: () => deleteGoal(goal.id)
    });
  };

  const handleAddLandmark = () => {
    openModal('NEW_LANDMARK', { goalId: goal.id });
  };

  const handleEditLandmark = (lm: Landmark) => {
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
          <button className="icon-btn xs" onClick={handleEditGoal} title={strings.common.edit}>
            <IconEdit size={13} />
          </button>
          <button className="icon-btn xs" onClick={() => duplicateGoal(goal.id)} title={strings.common.duplicate}>
            <IconCopy size={13} />
          </button>
          <button className="icon-btn xs danger" onClick={handleDeleteGoal} title={strings.common.delete}>
            <IconTrash size={13} />
          </button>
        </div>
      </div>

      {hasLandmarks && (
        <div className="goal-card-progress">
          <div className="goal-progress-row">
            <span>
              {strings.goals.landmarksCountLabel
                .replace('{done}', String(doneLandmarks))
                .replace('{total}', String(totalLandmarks))}
            </span>
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
          <div className="landmarks-title">{strings.goals.landmarksTitle}</div>
          {landmarks.map(lm => {
            const lmName = lm.name || lm.text || strings.goals.untitledLandmark;
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
                  <button className="icon-btn xs" onClick={() => handleEditLandmark(lm)} title={strings.common.edit}>
                    <IconEdit size={12} />
                  </button>
                  <button className="icon-btn xs" onClick={() => duplicateLandmark(goal.id, lm.id)} title={strings.common.duplicate}>
                    <IconCopy size={12} />
                  </button>
                  <button className="icon-btn xs danger" onClick={() => handleDeleteLandmark(lm.id)} title={strings.common.delete}>
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="goal-card-footer">
        {!hasLandmarks ? (
          <label className="goal-complete-toggle">
            <input
              type="checkbox"
              className="task-check goal-complete-checkbox"
              checked={goal.completed}
              onChange={() => toggleGoal(goal.id)}
            />
            {strings.common.markComplete}
          </label>
        ) : (
          <div />
        )}
        <button className="add-landmark-btn" onClick={handleAddLandmark}>
          {strings.goals.addLandmarkBtn}
        </button>
      </div>
    </div>
  );
};
