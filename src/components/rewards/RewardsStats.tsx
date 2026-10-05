import React from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { GridItem, LayoutGrid, type GridSpan } from '../ui/LayoutGrid';

const STAT_SPAN: GridSpan = { base: 12, md: 4 };

export const RewardsStats: React.FC = () => {
  const { state } = useApp();

  const readyCount = state.rewards.filter(r => r.status === 'ready').length;
  const lockedCount = state.rewards.filter(r => r.status === 'locked').length;
  const claimedCount = state.rewards.filter(r => r.status === 'claimed').length;

  return (
    <LayoutGrid id="rewardStatsContainer">
      <GridItem span={STAT_SPAN} className="rstat">
        <span className="rstat-num" id="rstatReady">{readyCount}</span>
        <span className="rstat-lbl">{strings.rewards.readyToClaim}</span>
      </GridItem>
      <GridItem span={STAT_SPAN} className="rstat">
        <span className="rstat-num" id="rstatLocked">{lockedCount}</span>
        <span className="rstat-lbl">{strings.rewards.inProgress}</span>
      </GridItem>
      <GridItem span={STAT_SPAN} className="rstat">
        <span className="rstat-num" id="rstatClaimed">{claimedCount}</span>
        <span className="rstat-lbl">{strings.rewards.claimed}</span>
      </GridItem>
    </LayoutGrid>
  );
};
