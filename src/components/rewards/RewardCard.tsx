import React from 'react';
import { Reward } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconGift, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { IconButton } from '../ui/IconButton';
import { format } from '../../lib/i18n';
import { frequencyLabel } from '../../constants/frequencies';

export interface RewardCardProps {
  reward: Reward;
  showClaim?: boolean;
  isClaimed?: boolean;
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, showClaim, isClaimed }) => {
  const { openModal, duplicateReward, deleteReward, claimReward } = useApp();
  const contextMenu = useContextMenu();

  const claimed = isClaimed || reward.status === 'claimed';
  const ready = showClaim !== undefined ? showClaim : reward.status === 'ready';
  const rewardFrequency = reward.frequency;
  const hasSessionLink = !!(reward.linkedSessionId || (reward.trigger === 'session' && reward.linkedId));
  const hasGoalLink = !!(reward.linkedGoalId || (reward.trigger === 'goal' && reward.linkedId));
  const isLandmark = reward.trigger === 'landmark';

  const handleEdit = () => {
    openModal('EDIT_REWARD', { reward });
  };

  const handleDelete = () => {
    openModal('CONFIRM_DELETE', {
      title: strings.rewards.deleteRewardTitle,
      message: format(strings.sessions.deleteConfirmPrompt, { name: reward.name }),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteReward(reward.id)
    });
  };

  const openRewardMenu = (e: React.MouseEvent) =>
    contextMenu(e, [
      ready && !claimed && {
        key: 'claim',
        label: strings.actions.claimReward,
        icon: <IconGift size={15} />,
        onSelect: () => claimReward(reward.id)
      },
      !claimed && { key: 'edit', label: strings.common.edit, icon: <IconEdit size={15} />, onSelect: handleEdit },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => duplicateReward(reward.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: handleDelete }
    ]);

  return (
    <div
      className={`reward-card ${reward.status === 'ready' ? 'ready' : ''} ${claimed ? 'claimed' : ''}`}
      data-rid={reward.id}
      onContextMenu={openRewardMenu}
    >
      <div className="reward-card-header">
        <div className="reward-card-emoji">{reward.emoji}</div>
        <div className="reward-card-info">
          <div className="reward-card-name">{reward.name}</div>
          <div className="reward-card-meta">
            <span className={`goal-type-badge badge-${rewardFrequency}`}>
              {frequencyLabel(rewardFrequency)}
            </span>
            {hasSessionLink && <span className="reward-trigger-badge">{strings.rewards.badgeSession}</span>}
            {hasGoalLink && <span className="reward-trigger-badge">{strings.rewards.badgeGoal}</span>}
            {isLandmark && <span className="reward-trigger-badge">{strings.rewards.badgeLandmark}</span>}
            {!hasSessionLink && !hasGoalLink && !isLandmark && (
              <span className="reward-trigger-badge">{strings.rewards.badgeManual}</span>
            )}
            {claimed && (
              <span className="reward-trigger-badge claimed">
                {strings.rewards.claimed}
              </span>
            )}
          </div>
        </div>
        <div className="reward-card-actions">
          {!claimed && (
            <IconButton label={strings.common.edit} size="xs" onClick={handleEdit}>
              <IconEdit size={13} />
            </IconButton>
          )}
          <IconButton label={strings.common.duplicate} size="xs" onClick={() => duplicateReward(reward.id)}>
            <IconCopy size={13} />
          </IconButton>
          <IconButton label={strings.common.delete} size="xs" tone="danger" onClick={handleDelete}>
            <IconTrash size={13} />
          </IconButton>
        </div>
      </div>

      {reward.description && (
        <div className="reward-card-desc">
          {reward.description}
        </div>
      )}

      {ready && !claimed && (
        <div className="reward-claim-container">
          <button className="claim-btn" onClick={() => claimReward(reward.id)}>
            {strings.actions.claimReward}
          </button>
        </div>
      )}
    </div>
  );
};
