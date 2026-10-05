import { describe, expect, it } from 'vitest';
import { moveById } from './reorder';

const items = ['a', 'b', 'c', 'd'].map(id => ({ id }));
const ids = (list: { id: string }[] | null) => list?.map(i => i.id).join('');

describe('moveById', () => {
  it('moves an item down to the target', () => {
    expect(ids(moveById(items, 'a', 'c'))).toBe('bcad');
  });

  it('moves an item up to the target', () => {
    expect(ids(moveById(items, 'd', 'b'))).toBe('adbc');
  });

  it('returns null when nothing moves', () => {
    expect(moveById(items, 'b', 'b')).toBeNull();
    expect(moveById(items, 'x', 'b')).toBeNull();
    expect(moveById(items, 'b', 'x')).toBeNull();
  });

  it('leaves the input as it was', () => {
    moveById(items, 'a', 'd');
    expect(ids(items)).toBe('abcd');
  });
});
