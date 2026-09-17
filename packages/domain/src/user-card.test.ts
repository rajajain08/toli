import { describe, expect, it } from 'vitest';
import { CardId, GroupId, UserCardId, UserId } from './ids';
import { LimitExceeded } from './errors';
import { LIMITS } from './limits';
import { UserCard } from './user-card';

const now = new Date('2026-09-18T00:00:00Z');
const card = () =>
  UserCard.create({
    id: UserCardId('uc1'),
    ownerId: UserId('u1'),
    cardId: CardId('hdfc-regalia'),
    now,
  });

describe('UserCard', () => {
  it('starts hidden from everyone', () => {
    expect(card().visibleTo.size).toBe(0);
  });

  it('show adds an audience without mutating the original', () => {
    const c = card();
    const shown = c.show(GroupId('g1'));
    expect(shown.isVisibleTo(GroupId('g1'))).toBe(true);
    expect(c.isVisibleTo(GroupId('g1'))).toBe(false);
  });

  it('show and hide are idempotent', () => {
    const c = card().show(GroupId('g1'));
    expect(c.show(GroupId('g1'))).toBe(c);
    const hidden = c.hide(GroupId('g1'));
    expect(hidden.hide(GroupId('g1'))).toBe(hidden);
    expect(hidden.visibleTo.size).toBe(0);
  });

  it('is visible to at most 50 audiences', () => {
    let c = card();
    for (let i = 0; i < LIMITS.audiencesPerCard; i++) c = c.show(GroupId(`g${i}`));
    expect(c.visibleTo.size).toBe(50);
    expect(() => c.show(GroupId('one-too-many'))).toThrow(LimitExceeded);
    expect(c.show(GroupId('g0'))).toBe(c);
  });

  it('rehydrate rejects more than 50 audiences', () => {
    const visibleTo = Array.from({ length: 51 }, (_, i) => GroupId(`g${i}`));
    expect(() =>
      UserCard.rehydrate({
        id: UserCardId('x'),
        ownerId: UserId('u'),
        cardId: CardId('c'),
        visibleTo,
        addedAt: now,
      }),
    ).toThrow(LimitExceeded);
  });

  it('diffVisibility reports added and removed audiences', () => {
    const before = new Set([GroupId('a'), GroupId('b')]);
    const after = new Set([GroupId('b'), GroupId('c')]);
    expect(UserCard.diffVisibility(before, after)).toEqual({ added: ['c'], removed: ['a'] });
    expect(UserCard.diffVisibility(undefined, after)).toEqual({ added: ['b', 'c'], removed: [] });
    expect(UserCard.diffVisibility(before, undefined)).toEqual({ added: [], removed: ['a', 'b'] });
  });
});
