import React from 'react';
import { Reward } from '../../types';
import { useApp } from '../../context/AppContext';

export interface RewardCardProps {
  reward: Reward;
  showClaim?: boolean;
  isClaimed?: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  session: 'Session',
  landmark: 'Landmark',
  goal: 'Goal',
  manual: 'Manual'
};

export const RewardCard: React.FC<RewardCardProps> = ({ reward, showClaim, isClaimed }) => {
  const { openModal, duplicateReward, deleteReward, claimReward } = useApp();

  const claimed = isClaimed || reward.status === 'claimed';
  const ready = showClaim !== undefined ? showClaim : reward.status === 'ready';
  const rewardFrequency = reward.frequency || reward.type || 'daily';
  const hasSessionLink = !!(reward.linkedSessionId || (reward.trigger === 'session' && reward.linkedId));
  const hasGoalLink = !!(reward.linkedGoalId || (reward.trigger === 'goal' && reward.linkedId));
  const isLandmark = reward.trigger === 'landmark';

  const handleEdit = () => {
    openModal('EDIT_REWARD', { reward });
  };

  const handleDelete = () => {
    openModal('CONFIRM_DELETE', {
      title: 'Delete Reward',
      message: `Delete reward "${reward.name}"?`,
      confirmLabel: 'Delete Reward',
      onConfirm: () => deleteReward(reward.id)
    });
  };

  return (
    <div
      className={`reward-card ${reward.status === 'ready' ? 'ready' : ''} ${claimed ? 'claimed' : ''}`}
      data-rid={reward.id}
    >
      <div className="reward-card-header">
        <div className="reward-card-emoji">{reward.emoji || reward.icon || '🎁'}</div>
        <div className="reward-card-info">
          <div className="reward-card-name">{reward.name}</div>
          <div className="reward-card-meta">
            <span className={`goal-type-badge badge-${rewardFrequency}`}>
              {rewardFrequency.charAt(0).toUpperCase() + rewardFrequency.slice(1)}
            </span>
            {hasSessionLink && <span className="reward-trigger-badge">Session</span>}
            {hasGoalLink && <span className="reward-trigger-badge">Goal</span>}
            {isLandmark && <span className="reward-trigger-badge">Landmark</span>}
            {!hasSessionLink && !hasGoalLink && !isLandmark && (
              <span className="reward-trigger-badge">Manual</span>
            )}
            {claimed && (
              <span className="reward-trigger-badge" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                Claimed
              </span>
            )}
          </div>
        </div>
        <div className="reward-card-actions">
          {!claimed && (
            <button className="icon-btn xs" onClick={handleEdit} title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button className="icon-btn xs" onClick={() => duplicateReward(reward.id)} title="Duplicate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button className="icon-btn xs danger" onClick={handleDelete} title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>

      {(reward.description || reward.desc) && (
        <div className="reward-card-desc" style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
          {reward.description || reward.desc}
        </div>
      )}

      {ready && !claimed && (
        <div style={{ marginTop: '12px' }}>
          <button className="claim-btn" onClick={() => claimReward(reward.id)}>
            🎉 Claim Reward
          </button>
        </div>
      )}
    </div>
  );
};
