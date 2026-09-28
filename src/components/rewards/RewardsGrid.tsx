import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RewardCard } from './RewardCard';
import { RewardsStats } from './RewardsStats';
import { FilterGridLayout, FilterTabOption } from '../ui/FilterGridLayout';
import { strings } from '../../constants/strings';
import { Button } from '../ui/Button';

const FREQUENCY_TABS: FilterTabOption[] = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'custom', label: 'Custom' }
];

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
      tabs={FREQUENCY_TABS}
      activeTab={filter}
      onTabChange={setFilter}
      headerSlot={<RewardsStats />}
      actionButton={
        <Button variant="primary" id="addRewardBtn" onClick={handleAddReward}>
          {strings.rewards.newRewardBtn}
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
