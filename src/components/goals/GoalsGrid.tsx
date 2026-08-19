import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GoalCard } from './GoalCard';
import { FilterGridLayout, FilterTabOption } from '../ui/FilterGridLayout';

const FREQUENCY_TABS: FilterTabOption[] = [
  { key: 'all', label: 'All' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'custom', label: 'Custom' }
];

export const GoalsGrid: React.FC = () => {
  const { state, openModal } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const handleAddGoal = () => {
    openModal('NEW_GOAL');
  };

  const filteredGoals = filter === 'all'
    ? state.goals
    : state.goals.filter(g => (g.type || g.frequency) === filter);

  return (
    <FilterGridLayout
      tabs={FREQUENCY_TABS}
      activeTab={filter}
      onTabChange={setFilter}
      actionButton={
        <button className="btn-action primary" id="addGoalBtn" onClick={handleAddGoal}>
          + New Goal
        </button>
      }
      hasItems={filteredGoals.length > 0}
      emptyMessage="No goals here yet. Add your first goal to stay motivated!"
    >
      {filteredGoals.map(goal => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </FilterGridLayout>
  );
};
