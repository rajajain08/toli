import { describe, expect, it } from 'vitest';
import { InvalidInvite } from './errors';
import { GroupId } from './ids';
import { INVITE_ALPHABET, Invite } from './invite';
import { LIMITS } from './limits';

const now = new Date('2026-09-18T00:00:00Z');
const day = 24 * 60 * 60 * 1000;
const mk = (maxUses?: number) =>
  Invite.create({
    audienceId: GroupId('g1'),
    randomIndices: [0, 1, 2, 3, 4, 5, 6, 7],
    now,
    ...(maxUses === undefined ? {} : { maxUses }),
  });

describe('Invite', () => {
  it('alphabet has 32 unambiguous characters', () => {
    expect(INVITE_ALPHABET).toHaveLength(32);
    expect(new Set(INVITE_ALPHABET).size).toBe(32);
    for (const ch of 'ILOU') expect(INVITE_ALPHABET).not.toContain(ch);
  });

  it('builds an 8-character code from random indices', () => {
    const inv = mk();
    expect(inv.code).toBe('ABCDEFGH');
    expect(inv.code).toHaveLength(LIMITS.inviteCodeLength);
    expect(inv.expiresAt.getTime() - now.getTime()).toBe(7 * day);
    expect(inv.uses).toBe(0);
    expect(inv.maxUses).toBe(LIMITS.inviteDefaultMaxUses);
  });

  it('rejects the wrong number of indices or out-of-range indices', () => {
    expect(() => Invite.create({ audienceId: GroupId('g'), randomIndices: [1, 2], now })).toThrow(
      InvalidInvite,
    );
    expect(() =>
      Invite.create({ audienceId: GroupId('g'), randomIndices: [0, 0, 0, 0, 0, 0, 0, 32], now }),
    ).toThrow(InvalidInvite);
    expect(() => mk(0)).toThrow(InvalidInvite);
  });

  it('is valid until the 7-day expiry, then expired', () => {
    const inv = mk();
    expect(inv.isValidAt(new Date(now.getTime() + 7 * day - 1))).toBe(true);
    expect(inv.isValidAt(new Date(now.getTime() + 7 * day))).toBe(false);
    expect(() => inv.assertValidAt(new Date(now.getTime() + 8 * day))).toThrow(
      expect.objectContaining({ reason: 'expired' }),
    );
  });

  it('is exhausted once uses reach maxUses', () => {
    let inv = mk(2);
    inv = inv.consume(now);
    inv = inv.consume(now);
    expect(inv.uses).toBe(2);
    expect(inv.isValidAt(now)).toBe(false);
    expect(() => inv.consume(now)).toThrow(expect.objectContaining({ reason: 'exhausted' }));
  });

  it('parseCode normalises what a person typed', () => {
    expect(Invite.parseCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(Invite.parseCode('ABCDEFG0')).toBe('ABCDEFG0');
    expect(Invite.parseCode('abcdefgo')).toBe('ABCDEFG0');
    expect(Invite.parseCode('abcdefgi')).toBe('ABCDEFG1');
    expect(() => Invite.parseCode('short')).toThrow(InvalidInvite);
    expect(() => Invite.parseCode('ABCDEFGHJ')).toThrow(InvalidInvite);
  });
});
