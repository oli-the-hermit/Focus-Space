import React, { useEffect, useRef, useState } from 'react';
import { Goal, Landmark } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconCheck, IconCopy, IconEdit, IconFlag, IconPlus, IconReset, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { Menu, tidyMenuItems } from '../ui/Menu';
import { ScheduleBadge } from './ScheduleBadge';
import { IconButton } from '../ui/IconButton';
import { Checkbox } from '../ui/Checkbox';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { format } from '../../lib/i18n';
import { frequencyLabel } from '../../constants/frequencies';
import { cx } from '../../lib/cx';
import { InlineTextArea } from '../ui/InlineTextArea';
import { LIMITS } from '../../constants/limits';
import { TIMING } from '../../constants/timing';
import type { DragItemProps } from '../../hooks/useDragReorder';

export interface GoalCardProps {
  goal: Goal;
  dragProps?: DragItemProps;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, dragProps, isDragging = false, isDragOver = false }) => {
  const {
    state,
    openModal,
    duplicateGoal,
    updateGoal,
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

  // The description saves in place; a short "Saved" in the footer confirms it.
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);
  const saveDescription = (description: string) => {
    updateGoal(goal.id, { description }, { silent: true });
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), TIMING.savedNoteMs);
  };

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
    <div
      className={cx('goal-card draggable-item drag-surface', isDragging && 'dragging', isDragOver && 'drag-over')}
      data-gid={goal.id}
      onContextMenu={openGoalMenu}
      {...dragProps}
    >
      <div className="goal-card-body">
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
            <Menu items={goalMenuItems} triggerSize="sm" />
          </div>
        </div>

        <InlineTextArea
          className="goal-description"
          value={goal.description ?? ''}
          onSave={saveDescription}
          placeholder={strings.goals.descriptionPlaceholder}
          ariaLabel={strings.goals.descriptionLabel}
          maxLength={LIMITS.goalDescription.max}
        />

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
                  <Checkbox
                    checked={lm.completed}
                    onChange={() => toggleLandmark(goal.id, lm.id)}
                    aria-label={lmName}
                  />
                  <span className="landmark-text">{lmName}</span>
                  <ScheduleBadge startDate={lm.startDate} dueDate={lm.dueDate} completed={lm.completed} compact />
                  {lmReward && <span className="landmark-reward-tag">{lmReward.emoji} {lmReward.name}</span>}
                  <div className="landmark-actions">
                    <IconButton label={strings.common.edit} size="xs" surface={2} onClick={() => handleEditLandmark(lm)}>
                      <IconEdit size={12} />
                    </IconButton>
                    <IconButton label={strings.common.duplicate} size="xs" surface={2} onClick={() => duplicateLandmark(goal.id, lm.id)}>
                      <IconCopy size={12} />
                    </IconButton>
                    <IconButton label={strings.common.delete} size="xs" tone="danger" surface={2} onClick={() => handleDeleteLandmark(lm.id)}>
                      <IconTrash size={12} />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="goal-card-footer">
          <Button
            size="sm"
            collapsible
            icon={<IconPlus size={14} strokeWidth={2.4} />}
            aria-label={strings.actions.addLandmark}
            title={strings.actions.addLandmark}
            onClick={handleAddLandmark}
          >
            {strings.goals.landmarkBtn}
          </Button>
          <span className="goal-saved" role="status">
            {saved && (
              <>
                <IconCheck size={14} strokeWidth={2.6} />
                {strings.goals.descriptionSaved}
              </>
            )}
          </span>
          {/* Reads Complete, then Done; a goal with landmarks completes on its own. */}
          <Button
            variant="primary"
            size="sm"
            className="goal-complete-btn"
            icon={<IconCheck size={14} strokeWidth={2.6} />}
            aria-pressed={isComplete}
            aria-label={format(isComplete ? strings.goals.doneLabel : strings.goals.completeLabel, { name: goalName })}
            aria-disabled={hasLandmarks || undefined}
            title={hasLandmarks ? strings.goals.completesWithLandmarks : undefined}
            onClick={hasLandmarks ? undefined : () => toggleGoal(goal.id)}
          >
            {isComplete ? strings.goals.doneBtn : strings.goals.completeBtn}
          </Button>
        </div>
      </div>
    </div>
  );
};