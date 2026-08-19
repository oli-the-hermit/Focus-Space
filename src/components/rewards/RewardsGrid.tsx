import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RewardCard } from './RewardCard';
import { RewardsStats } from './RewardsStats';
import { FilterGridLayout, FilterTabOption } from '../ui/FilterGridLayout';

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
        <button className="btn-action primary" id="addRewardBtn" onClick={handleAddReward}>
          + New Reward
        </button>
      }
      hasItems={filteredRewards.length > 0}
      emptyMessage="No rewards here yet. Add a reward to celebrate your focus sessions and accomplishments!"
    >
      {filteredRewards.map(reward => (
        <RewardCard key={reward.id} reward={reward} />
      ))}
    </FilterGridLayout>
  );
};
