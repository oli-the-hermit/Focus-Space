import React from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { Button } from '../ui/Button';
import { useBlockingOverlay } from '../../lib/overlays';

export const CelebrationOverlay: React.FC = () => {
  const { activeCelebrationReward, dismissCelebration } = useApp();
  useBlockingOverlay(!!activeCelebrationReward);

  if (!activeCelebrationReward) return null;

  return (
    <div
      className="celebration-backdrop"
      id="celebrationBackdrop"
      onClick={e => {
        if (e.target === e.currentTarget) dismissCelebration();
      }}
    >
      <div className="celebration-card">
        <div className="celebration-emoji" id="celebrationEmoji">
          {activeCelebrationReward.emoji}
        </div>
        <h2 className="celebration-title" id="celebrationTitle">
          {strings.celebration.rewardClaimed}
        </h2>
        <p className="celebration-desc" id="celebrationDesc">
          {activeCelebrationReward.description || strings.celebration.desc}
        </p>
        <Button
          variant="primary"
          surface="accent"
          className="celebration-confirm-btn"
          id="closeCelebrationBtn"
          onClick={dismissCelebration}
        >
          {strings.celebration.awesomeBtn}
        </Button>
      </div>
    </div>
  );
};
