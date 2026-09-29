import { describe, expect, it } from 'vitest';
import { assignReward, isManualReward, rewardLinks, unlockReward } from './rewardLinks';
import type { Goal, Reward, Session } from '../types';

const session = (id: string, rewardId: string | null = null): Session => ({ id, name: id, focusMinutes: 25, breakMinutes: 5, rewardId });
const goal = (id: string, rewardId: string | null = null, landmarkRewards: (string | null)[] = []): Goal => ({
  id,
  name: id,
  frequency: 'daily',
  completed: false,
  rewardId,
  landmarks: landmarkRewards.map((r, i) => ({ id: `${id}-l${i}`, name: 'L', completed: false, rewardId: r }))
});
const reward = (id: string, status: Reward['status']): Reward => ({ id, name: id, description: '', emoji: '🎁', frequency: 'daily', status });

describe('rewardLinks', () => {
  it('finds the session, goal and landmarks that point at a reward', () => {
    const owners = { sessions: [session('s1'), session('s2', 'r')], goals: [goal('g1', 'r', ['r', null, 'x'])] };
    expect(rewardLinks(owners, 'r')).toEqual({ sessionId: 's2', goalId: 'g1', landmarkIds: ['g1-l0'] });
  });

  it('is manual when nothing points at it', () => {
    const links = rewardLinks({ sessions: [session('s1', 'other')], goals: [] }, 'r');
    expect(isManualReward(links)).toBe(true);
    expect(isManualReward({ sessionId: null, goalId: null, landmarkIds: ['l'] })).toBe(false);
  });
});

describe('assignReward', () => {
  it('moves the reward to one owner and unlinks the others', () => {
    const out = assignReward([session('a', 'r'), session('b', 'r'), session('c', 'x')], 'r', 'c');
    expect(out.map(s => s.rewardId)).toEqual([null, null, 'r']);
  });

  it('unlinks everyone for a null owner and keeps unrelated items as they are', () => {
    const input = [session('a', 'r'), session('b', 'x')];
    const out = assignReward(input, 'r', null);
    expect(out[0].rewardId).toBeNull();
    expect(out[1]).toBe(input[1]);
  });
});

describe('unlockReward', () => {
  it('turns only that locked reward ready', () => {
    const out = unlockReward([reward('r', 'locked'), reward('c', 'claimed'), reward('o', 'locked')], 'r');
    expect(out.map(r => r.status)).toEqual(['ready', 'claimed', 'locked']);
    expect(unlockReward([reward('c', 'claimed')], 'c')[0].status).toBe('claimed');
  });

  it('does nothing without an id', () => {
    const rewards = [reward('r', 'locked')];
    expect(unlockReward(rewards, null)).toBe(rewards);
  });
});
