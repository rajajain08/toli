import { describe, expect, it } from 'vitest';
import { Audience } from './audience';
import { AudienceFull, InvalidArgument } from './errors';
import { GroupId, UserId } from './ids';
import { LIMITS } from './limits';

const now = new Date('2026-09-18T00:00:00Z');

describe('Audience', () => {
  it('directId is deterministic regardless of argument order', () => {
    expect(Audience.directId(UserId('bob'), UserId('alice'))).toBe('direct_alice_bob');
    expect(Audience.directId(UserId('alice'), UserId('bob'))).toBe('direct_alice_bob');
    expect(Audience.isDirectId('direct_alice_bob')).toBe(true);
    expect(Audience.isDirectId('g1')).toBe(false);
  });

  it('refuses a direct share with yourself', () => {
    expect(() => Audience.directId(UserId('a'), UserId('a'))).toThrow(InvalidArgument);
    expect(() =>
      Audience.createDirect({ a: UserId('a'), b: UserId('a'), createdBy: UserId('a'), now }),
    ).toThrow(InvalidArgument);
  });

  it('a direct audience holds exactly two members', () => {
    const d = Audience.createDirect({
      a: UserId('a'),
      b: UserId('b'),
      createdBy: UserId('a'),
      now,
    });
    expect(d.isDirect).toBe(true);
    expect(d.name).toBeUndefined();
    expect(d.canAccept(0)).toBe(true);
    expect(d.canAccept(1)).toBe(true);
    expect(d.canAccept(2)).toBe(false);
    expect(() => d.assertCanAccept(2)).toThrow(AudienceFull);
  });

  it('a group holds 50 members for MVP', () => {
    const g = Audience.createGroup({
      id: GroupId('g1'),
      name: '  Goa   trip ',
      createdBy: UserId('a'),
      now,
    });
    expect(g.name).toBe('Goa trip');
    expect(g.canAccept(LIMITS.membersPerAudience - 1)).toBe(true);
    expect(g.canAccept(LIMITS.membersPerAudience)).toBe(false);
    expect(g.withCounts({ memberCount: 50 }).canAccept()).toBe(false);
  });

  it('validates group names', () => {
    expect(() =>
      Audience.createGroup({ id: GroupId('g'), name: '   ', createdBy: UserId('a'), now }),
    ).toThrow(InvalidArgument);
    expect(() =>
      Audience.createGroup({ id: GroupId('g'), name: 'x'.repeat(41), createdBy: UserId('a'), now }),
    ).toThrow(InvalidArgument);
  });

  it('counters never go negative', () => {
    const g = Audience.createGroup({ id: GroupId('g1'), name: 'x', createdBy: UserId('a'), now });
    expect(g.withCounts({ cardCount: -3 }).cardCount).toBe(0);
  });
});
