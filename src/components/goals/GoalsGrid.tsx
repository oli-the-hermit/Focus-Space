import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GoalCard } from './GoalCard';
import { FilterGridLayout } from '../ui/FilterGridLayout';
import { FREQUENCY_FILTER_TABS } from '../../constants/frequencies';
import { strings } from '../../constants/strings';
import { Button } from '../ui/Button';
import { IconPlus } from '../ui/icons';
import { useDragReorder } from '../../hooks/useDragReorder';


export const GoalsGrid: React.FC = () => {
  const { state, openModal, reorderGoals } = useApp();
  const [filter, setFilter] = useState<string>('all');
  const drag = useDragReorder(reorderGoals);

  const handleAddGoal = () => {
    openModal('NEW_GOAL');
  };

  const filteredGoals = filter === 'all'
    ? state.goals
    : state.goals.filter(g => g.frequency === filter);

  return (
    <FilterGridLayout
      tabs={FREQUENCY_FILTER_TABS}
      activeTab={filter}
      onTabChange={setFilter}
      tabsLabel={strings.goals.filterLabel}
      actionButton={
        <Button variant="primary" id="addGoalBtn" icon={<IconPlus size={16} strokeWidth={2.4} />} onClick={handleAddGoal}>
          {strings.actions.newGoal}
        </Button>
      }
      hasItems={filteredGoals.length > 0}
      emptyMessage={strings.goals.emptyGoals}
    >
      {filteredGoals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          dragProps={drag.itemProps(goal.id)}
          isDragging={drag.isDragging(goal.id)}
          isDragOver={drag.isDragOver(goal.id)}
        />
      ))}
    </FilterGridLayout>
  );
};
