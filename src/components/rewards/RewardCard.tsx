import React from 'react';
import { Reward } from '../../types';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconEdit, IconCopy, IconGift, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { Menu, tidyMenuItems } from '../ui/Menu';
import { Button } from '../ui/Button';
import { format } from '../../lib/i18n';
import { frequencyLabel } from '../../constants/frequencies';
import { isManualReward, rewardLinks } from '../../lib/rewardLinks';

export interface RewardCardProps {
  reward: Reward;
  showClaim?: boolean;
  isClaimed?: boolean;
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, showClaim, isClaimed }) => {
  const { state, openModal, duplicateReward, deleteReward, claimReward } = useApp();
  const contextMenu = useContextMenu();

  const claimed = isClaimed || reward.status === 'claimed';
  const ready = showClaim !== undefined ? showClaim : reward.status === 'ready';
  const rewardFrequency = reward.frequency;
  const links = rewardLinks(state, reward.id);

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

  // One list for the ⋮ button and the right-click menu.
  const rewardMenuItems = tidyMenuItems([
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
  const openRewardMenu = (e: React.MouseEvent) => contextMenu(e, rewardMenuItems);

  return (
    <div
      className={`reward-card ${reward.status === 'ready' ? 'ready' : ''} ${claimed ? 'claimed' : ''}`}
      data-rid={reward.id}
      onContextMenu={openRewardMenu}
    >
      <div className="reward-card-header">
        <div className="reward-card-emoji">{reward.emoji}</div>
        <div className="reward-card-name">{reward.name}</div>
        <div className="reward-card-actions">
          <Menu items={rewardMenuItems} triggerSize="sm" triggerSurface={reward.status === 'ready' ? 'accent-container' : undefined} />
        </div>
      </div>

      {/* Full width under the header, starting at the card's edge like the emoji. */}
      <div className="reward-card-meta">
        <span className={`goal-type-badge badge-${rewardFrequency}`}>
          {frequencyLabel(rewardFrequency)}
        </span>
        {links.sessionId && <span className="reward-trigger-badge">{strings.rewards.badgeSession}</span>}
        {links.goalId && <span className="reward-trigger-badge">{strings.rewards.badgeGoal}</span>}
        {links.landmarkIds.length > 0 && <span className="reward-trigger-badge">{strings.rewards.badgeLandmark}</span>}
        {isManualReward(links) && <span className="reward-trigger-badge">{strings.rewards.badgeManual}</span>}
        {claimed && (
          <span className="reward-trigger-badge claimed">
            {strings.rewards.claimed}
          </span>
        )}
      </div>

      {reward.description && (
        <div className="reward-card-desc">
          {reward.description}
        </div>
      )}

      {ready && !claimed && (
        <div className="reward-claim-container">
          <Button variant="primary" size="lg" block surface="accent-container" onClick={() => claimReward(reward.id)}>
            {strings.actions.claimReward}
          </Button>
        </div>
      )}
    </div>
  );
};
