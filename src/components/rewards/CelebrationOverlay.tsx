import React from 'react';
import { useApp } from '../../context/AppContext';

export const CelebrationOverlay: React.FC = () => {
  const { activeCelebrationReward, dismissCelebration } = useApp();

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
          {activeCelebrationReward.emoji || activeCelebrationReward.icon || '🎉'}
        </div>
        <h2 className="celebration-title" id="celebrationTitle">
          Reward Claimed!
        </h2>
        <p className="celebration-desc" id="celebrationDesc">
          {activeCelebrationReward.description || activeCelebrationReward.desc || "You've earned your reward."}
        </p>
        <button
          className="btn-action primary"
          id="closeCelebrationBtn"
          onClick={dismissCelebration}
          style={{ padding: '10px 24px' }}
        >
          Awesome!
        </button>
      </div>
    </div>
  );
};
