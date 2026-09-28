import { describe, expect, it } from 'vitest';
import { normalizeGoal, normalizeLandmark, normalizeReward, normalizeTask } from './normalize';
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

  it('keeps the other fields', () => {
    expect(normalizeReward({ id: 'r', name: 'X', linkedGoalId: 'g1', claimedAt: 5 })).toMatchObject({ linkedGoalId: 'g1', claimedAt: 5 });
  });
});

describe('normalizeTask', () => {
  it('moves created to createdAt', () => {
    const t = normalizeTask({ id: 't', text: 'x', completed: false, created: 42 });
    expect(t.createdAt).toBe(42);
    expect(t).not.toHaveProperty('created');
  });
});
