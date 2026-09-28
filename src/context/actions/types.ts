import type React from 'react';
import type { AppState, Reward } from '../../types';

/**
 * What the action modules get from AppProvider. Each module takes only the
 * pieces it uses; state changes always go through setState's updater form.
 */
export interface ActionDeps {
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (message: string) => void;
  /** The latest state, for decisions that must happen outside a setState updater. */
  stateRef: React.MutableRefObject<AppState>;
  /** When the running phase ends (ms since epoch), or null when idle. */
  targetEndTimeRef: React.MutableRefObject<number | null>;
  setActiveCelebrationReward: (reward: Reward | null) => void;
}
