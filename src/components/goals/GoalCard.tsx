import React from 'react';
import { Goal, Landmark } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconCheck, IconCopy, IconEdit, IconFlag, IconPlus, IconReset, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { Menu, tidyMenuItems } from '../ui/Menu';
import { ScheduleBadge } from './ScheduleBadge';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { format } from '../../lib/i18n';
import { frequencyLabel } from '../../constants/frequencies';

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
  const contextMenu = useContextMenu();

  const goalName = goal.name;
  const goalType = goal.frequency;
  const landmarks = goal.landmarks || [];
  const hasLandmarks = landmarks.length > 0;

  const totalLandmarks = landmarks.length;
  const doneLandmarks = landmarks.filter(l => l.completed).length;
  const pct = hasLandmarks
    ? (totalLandmarks > 0 ? Math.round((doneLandmarks / totalLandmarks) * 100) : 0)
    : (goal.completed ? 100 : 0);
  const isComplete = pct === 100;
  const landmarksLabel = format(strings.goals.landmarksCountLabel, { done: doneLandmarks, total: totalLandmarks });

  const linkedReward = goal.rewardId ? state.rewards.find(r => r.id === goal.rewardId) : null;

  const handleEditGoal = () => {
    openModal('EDIT_GOAL', { goal });
  };

  const handleDeleteGoal = () => {
    openModal('CONFIRM_DELETE', {
      title: strings.goals.deleteGoalTitle,
      message: format(strings.sessions.deleteConfirmPrompt, { name: goalName }),
      confirmLabel: strings.common.delete,
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

  const cm = strings.actions;

  // One list for the ⋮ button and the right-click menu.
  const goalMenuItems = tidyMenuItems([
      { key: 'edit', label: strings.common.edit, icon: <IconEdit size={15} />, onSelect: handleEditGoal },
      { key: 'landmark', label: cm.addLandmark, icon: <IconFlag size={15} />, onSelect: handleAddLandmark },
      !hasLandmarks && {
        key: 'toggle',
        label: goal.completed ? cm.markNotDone : strings.common.markComplete,
        icon: goal.completed ? <IconReset size={15} /> : <IconCheck size={15} />,
        onSelect: () => toggleGoal(goal.id)
      },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => duplicateGoal(goal.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: handleDeleteGoal }
    ]);
  const openGoalMenu = (e: React.MouseEvent) => contextMenu(e, goalMenuItems);

  const openLandmarkMenu = (e: React.MouseEvent, lm: Landmark) => {
    // The goal card's own handler would otherwise replace this menu.
    e.stopPropagation();
    contextMenu(e, [
      {
        key: 'toggle',
        label: lm.completed ? cm.markNotDone : strings.common.markComplete,
        icon: lm.completed ? <IconReset size={15} /> : <IconCheck size={15} />,
        onSelect: () => toggleLandmark(goal.id, lm.id)
      },
      { key: 'edit', label: strings.common.edit, icon: <IconEdit size={15} />, onSelect: () => handleEditLandmark(lm) },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => duplicateLandmark(goal.id, lm.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: () => handleDeleteLandmark(lm.id) }
    ]);
  };

  return (
    <div className="goal-card" data-gid={goal.id} onContextMenu={openGoalMenu}>
      <div className="goal-card-header">
        <div className="goal-card-header-info">
          <div className="goal-card-title">{goalName}</div>
          <div className="goal-card-meta">
            <span className={`goal-type-badge badge-${goalType}`}>
              {frequencyLabel(goalType)}
            </span>
            {linkedReward && (
              <span className="goal-reward-badge">{linkedReward.emoji} {linkedReward.name}</span>
            )}
          </div>
          <ScheduleBadge startDate={goal.startDate} dueDate={goal.dueDate} completed={isComplete} />
        </div>
        <div className="goal-card-actions">
          <Menu items={goalMenuItems} triggerClassName="icon-btn sm" />
        </div>
      </div>

      {hasLandmarks && (
        <div className="goal-card-progress">
          <div className="goal-progress-row">
            <span>{landmarksLabel}</span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={pct} size="lg" complete={isComplete} label={landmarksLabel} />
        </div>
      )}

      {hasLandmarks && (
        <div className="goal-landmarks">
          <div className="landmarks-title">{strings.goals.landmarksTitle}</div>
          {landmarks.map(lm => {
            const lmName = lm.name;
            const lmReward = lm.rewardId ? state.rewards.find(r => r.id === lm.rewardId) : null;

            return (
              <div
                key={lm.id}
                className={`landmark-item ${lm.completed ? 'landmark-done' : ''}`}
                data-lmid={lm.id}
                onContextMenu={e => openLandmarkMenu(e, lm)}
              >
                <input
                  type="checkbox"
                  className="landmark-check"
                  checked={lm.completed}
                  onChange={() => toggleLandmark(goal.id, lm.id)}
                />
                <span className="landmark-text">{lmName}</span>
                <ScheduleBadge startDate={lm.startDate} dueDate={lm.dueDate} completed={lm.completed} compact />
                {lmReward && <span className="landmark-reward-tag">{lmReward.emoji} {lmReward.name}</span>}
                <div className="landmark-actions">
                  <IconButton label={strings.common.edit} size="xs" onClick={() => handleEditLandmark(lm)}>
                    <IconEdit size={12} />
                  </IconButton>
                  <IconButton label={strings.common.duplicate} size="xs" onClick={() => duplicateLandmark(goal.id, lm.id)}>
                    <IconCopy size={12} />
                  </IconButton>
                  <IconButton label={strings.common.delete} size="xs" tone="danger" onClick={() => handleDeleteLandmark(lm.id)}>
                    <IconTrash size={12} />
                  </IconButton>
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
        <button type="button" className="add-landmark-btn" onClick={handleAddLandmark}>
          <IconPlus size={15} strokeWidth={2.4} />
          {strings.actions.addLandmark}
        </button>
      </div>
    </div>
  );
};
