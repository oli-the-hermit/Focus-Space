import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RewardCard } from './RewardCard';
import { RewardsStats } from './RewardsStats';
import { FilterGridLayout } from '../ui/FilterGridLayout';
import { FREQUENCY_FILTER_TABS } from '../../constants/frequencies';
import { strings } from '../../constants/strings';
import { Button } from '../ui/Button';
import { IconPlus } from '../ui/icons';


export const RewardsGrid: React.FC = () => {
  const { state, openModal } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const handleAddReward = () => {
    openModal('NEW_REWARD');
  };

  const filteredRewards = filter === 'all'
    ? state.rewards
    : state.rewards.filter(r => (r.frequency || r.type || 'daily') === filter);

  return (
    <FilterGridLayout
      tabs={FREQUENCY_FILTER_TABS}
      activeTab={filter}
      onTabChange={setFilter}
      headerSlot={<RewardsStats />}
      actionButton={
        <Button variant="primary" id="addRewardBtn" icon={<IconPlus size={16} strokeWidth={2.4} />} onClick={handleAddReward}>
          {strings.actions.newReward}
        </Button>
      }
      hasItems={filteredRewards.length > 0}
      emptyMessage={strings.rewards.emptyReady}
    >
      {filteredRewards.map(reward => (
        <RewardCard key={reward.id} reward={reward} />
      ))}
    </FilterGridLayout>
  );
};
