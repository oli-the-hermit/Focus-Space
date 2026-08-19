import React from 'react';
import { useApp } from '../../context/AppContext';

export const RewardsStats: React.FC = () => {
  const { state } = useApp();

  const readyCount = state.rewards.filter(r => r.status === 'ready').length;
  const lockedCount = state.rewards.filter(r => r.status === 'locked').length;
  const claimedCount = state.rewards.filter(r => r.status === 'claimed').length;

  return (
    <div className="reward-stats" id="rewardStatsContainer">
      <div className="rstat">
        <span className="rstat-num" id="rstatReady">{readyCount}</span>
        <span className="rstat-lbl">Ready</span>
      </div>
      <div className="rstat">
        <span className="rstat-num" id="rstatLocked">{lockedCount}</span>
        <span className="rstat-lbl">In Progress</span>
      </div>
      <div className="rstat">
        <span className="rstat-num" id="rstatClaimed">{claimedCount}</span>
        <span className="rstat-lbl">Claimed</span>
      </div>
    </div>
  );
};
