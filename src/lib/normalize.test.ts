import { describe, expect, it } from 'vitest';
import { migrateRewardLinks, normalizeGoal, normalizeLandmark, normalizeReward, normalizeState, normalizeTask } from './normalize';
import { strings } from '../constants/strings';
import { DEFAULT_REWARD_EMOJI } from '../constants/defaults';

describe('normalizeGoal', () => {
  it('reads the old title/type fields and drops them', () => {
    const g = normalizeGoal({ id: 'g1', title: 'Read more', type: 'weekly', completed: false, landmarks: [] });
    expect(g).toMatchObject({ name: 'Read more', frequency: 'weekly' });
    expect(g).not.toHaveProperty('title');
    expect(g).not.toHaveProperty('type');
  });

  it('prefers the canonical fields when both exist', () => {
    expect(normalizeGoal({ id: 'g', name: 'New', title: 'Old', frequency: 'monthly', type: 'daily' }))
      .toMatchObject({ name: 'New', frequency: 'monthly' });
  });

  it('fills defaults and normalizes nested landmarks', () => {
    const g = normalizeGoal({ id: 'g', landmarks: [{ id: 'l', text: 'Chapter 1' }] });
    expect(g).toMatchObject({ name: strings.goals.untitledGoal, frequency: 'daily', completed: false });
    expect(g.landmarks[0]).toMatchObject({ name: 'Chapter 1', completed: false });
    expect(g.landmarks[0]).not.toHaveProperty('text');
  });

  it('ignores a frequency value it does not know', () => {
    expect(normalizeGoal({ id: 'g', frequency: 'hourly' }).frequency).toBe('daily');
  });
});

describe('normalizeLandmark', () => {
  it('uses the untitled label for an empty name', () => {
    expect(normalizeLandmark({ id: 'l', name: '  ' }).name).toBe(strings.goals.untitledLandmark);
  });
});

describe('normalizeReward', () => {
  it('reads desc/icon/type and drops them', () => {
    const r = normalizeReward({ id: 'r', name: 'Coffee', desc: 'A break', icon: '☕', type: 'weekly', trigger: 'manual', status: 'ready' });
    expect(r).toMatchObject({ description: 'A break', emoji: '☕', frequency: 'weekly' });
    expect(r).not.toHaveProperty('desc');
    expect(r).not.toHaveProperty('icon');
    expect(r).not.toHaveProperty('type');
  });

  it('fills the default emoji and an empty description', () => {
    expect(normalizeReward({ id: 'r', name: 'X' })).toMatchObject({ emoji: DEFAULT_REWARD_EMOJI, description: '', frequency: 'daily' });
  });

  it('keeps the other fields and drops the old link fields', () => {
    const r = normalizeReward({ id: 'r', name: 'X', trigger: 'goal', linkedId: 'g1', linkedSessionId: null, linkedGoalId: 'g1', claimedAt: 5 });
    expect(r).toMatchObject({ claimedAt: 5 });
    for (const key of ['trigger', 'linkedId', 'linkedSessionId', 'linkedGoalId']) expect(r).not.toHaveProperty(key);
  });
});

describe('migrateRewardLinks', () => {
  const s = (id: string, rewardId: string | null = null) => ({ id, name: id, focusMinutes: 25, breakMinutes: 5, rewardId });
  const g = (id: string, rewardId: string | null = null) => ({
    id, name: id, frequency: 'daily' as const, completed: false, rewardId,
    landmarks: [{ id: `${id}-lm`, name: 'L', completed: false, rewardId: null }]
  });

  it('moves each old link form onto the unlocker', () => {
    const out = migrateRewardLinks(
      [
        { id: 'r1', linkedSessionId: 's1' },
        { id: 'r2', trigger: 'session', linkedId: 's2' },
        { id: 'r3', trigger: 'goal', linkedId: 'g1' },
        { id: 'r4', linkedGoalId: 'g2' },
        { id: 'r5', trigger: 'landmark', linkedId: 'g1-lm' }
      ],
      [s('s1'), s('s2'), s('s3')],
      [g('g1'), g('g2')]
    );
    expect(out.sessions.map(x => x.rewardId)).toEqual(['r1', 'r2', null]);
    expect(out.goals.map(x => x.rewardId)).toEqual(['r3', 'r4']);
    expect(out.goals[0].landmarks[0].rewardId).toBe('r5');
  });

  it('keeps a link the unlocker already has, and ignores unknown ids', () => {
    const out = migrateRewardLinks([{ id: 'r1', linkedSessionId: 's1' }, { id: 'r2', linkedSessionId: 'gone' }], [s('s1', 'r0')], []);
    expect(out.sessions[0].rewardId).toBe('r0');
  });
});

describe('normalizeTask', () => {
  it('moves created to createdAt', () => {
    const t = normalizeTask({ id: 't', text: 'x', completed: false, created: 42 });
    expect(t.createdAt).toBe(42);
    expect(t).not.toHaveProperty('created');
  });
});

describe('normalizeState', () => {
  it('fills a complete state from nothing', () => {
    const s = normalizeState(null);
    expect(s.sessions.length).toBeGreaterThan(0);
    expect(s.timer).toMatchObject({ phase: 'focus', status: 'idle' });
    expect(s.theme).toBe('system');
    expect(s.accent).toBe('solar-lime');
    expect(s.tourSeen).toBe(false);
  });

  it('keeps a known accent and falls back to Solar Lime otherwise', () => {
    expect(normalizeState({ accent: 'nebula-purple' }).accent).toBe('nebula-purple');
    expect(normalizeState({ accent: 'hot-pink' }).accent).toBe('solar-lime');
    expect(normalizeState({ accent: { id: 'sage' } }).accent).toBe('solar-lime');
  });

  it('gives the legacy global timer list to the active session only', () => {
    const s = normalizeState({
      sessions: [{ id: 'a', name: 'A', focusMinutes: 30, breakMinutes: 5 }, { id: 'b', name: 'B', focusMinutes: 20, breakMinutes: 5 }],
      activeSessionId: 'a',
      taskLists: [{ id: 'l1', name: 'L', tasks: [] }],
      selectedListIdForTimer: 'l1'
    });
    expect(s.sessions.find(x => x.id === 'a')?.taskListIds).toEqual(['l1']);
    expect(s.sessions.find(x => x.id === 'b')?.taskListIds).toEqual([]);
    expect(s.timer.remaining).toBe(30 * 60);
  });

  it('drops task-list links to lists that no longer exist', () => {
    const s = normalizeState({
      sessions: [{ id: 'a', name: 'A', focusMinutes: 25, breakMinutes: 5, taskListIds: ['gone', 'l1'] }],
      taskLists: [{ id: 'l1', name: 'L', tasks: [] }]
    });
    expect(s.sessions[0].taskListIds).toEqual(['l1']);
  });

  it('migrates nested aliases while loading', () => {
    const s = normalizeState({
      taskLists: [{ id: 'l1', name: 'L', tasks: [{ id: 't', text: 'x', completed: false, created: 7 }] }],
      goals: [{ id: 'g', title: 'Old goal', type: 'weekly', landmarks: [] }],
      rewards: [{ id: 'r', name: 'R', icon: '☕', trigger: 'manual', status: 'ready' }]
    });
    expect(s.taskLists[0].tasks[0].createdAt).toBe(7);
    expect(s.goals[0]).toMatchObject({ name: 'Old goal', frequency: 'weekly' });
    expect(s.rewards[0].emoji).toBe('☕');
  });

  it('moves reward links onto sessions while loading', () => {
    const s = normalizeState({
      sessions: [{ id: 'a', name: 'A', focusMinutes: 25, breakMinutes: 5 }],
      rewards: [{ id: 'r', name: 'R', trigger: 'session', linkedId: 'a', linkedSessionId: 'a', status: 'locked' }]
    });
    expect(s.sessions[0].rewardId).toBe('r');
    expect(s.rewards[0]).not.toHaveProperty('linkedSessionId');
  });
});
