import React from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';

export const RewardsStats: React.FC = () => {
  const { state } = useApp();

  const readyCount = state.rewards.filter(r => r.status === 'ready').length;
  const lockedCount = state.rewards.filter(r => r.status === 'locked').length;
  const claimedCount = state.rewards.filter(r => r.status === 'claimed').length;

  return (
    <div className="reward-stats" id="rewardStatsContainer">
      <div className="rstat">
        <span className="rstat-num" id="rstatReady">{readyCount}</span>
        <span className="rstat-lbl">{strings.rewards.readyToClaim}</span>
      </div>
      <div className="rstat">
        <span className="rstat-num" id="rstatLocked">{lockedCount}</span>
        <span className="rstat-lbl">{strings.rewards.inProgress}</span>
      </div>
      <div className="rstat">
        <span className="rstat-num" id="rstatClaimed">{claimedCount}</span>
        <span className="rstat-lbl">{strings.rewards.claimed}</span>
      </div>
    </div>
  );
};
