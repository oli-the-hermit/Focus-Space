import type React from 'react';
import type { AppState, Reward, ShowToast } from '../../types';

/**
 * What the action modules get from AppProvider. Each module takes only the
 * pieces it uses; state changes always go through setState's updater form.
 */
export interface ActionDeps {
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: ShowToast;
  /** The latest state, for decisions that must happen outside a setState updater. */
  stateRef: React.MutableRefObject<AppState>;
  /** Stops the timer's ticker at once (the state change that ends the run follows). */
  stopTicker: () => void;
  setActiveCelebrationReward: (reward: Reward | null) => void;
}
