import { describe, expect, it } from 'vitest';
import { InvalidArgument } from './errors';
import { UserId } from './ids';
import { CONSENT_VERSION, createUser, needsConsent, normaliseDisplayName } from './user';

const now = new Date('2026-09-18T00:00:00Z');
const hash = 'a'.repeat(64);

describe('User', () => {
  it('normalises the display name', () => {
    expect(normaliseDisplayName('  Raja   Jain ')).toBe('Raja Jain');
    expect(() => normaliseDisplayName('   ')).toThrow(InvalidArgument);
    expect(() => normaliseDisplayName('x'.repeat(41))).toThrow(InvalidArgument);
  });

  it('records consent and creation time', () => {
    const u = createUser({ id: UserId('u1'), name: 'Raja', phoneHash: hash, consentAt: now, now });
    expect(u.consentAt).toBe(now);
    expect(u.createdAt).toBe(now);
  });

  it('stamps the current consent version, and knows when an older one must be asked again', () => {
    const u = createUser({ id: UserId('u1'), name: 'Raja', phoneHash: hash, consentAt: now, now });
    expect(u.consentVersion).toBe(CONSENT_VERSION);
    expect(needsConsent(u)).toBe(false);
    expect(needsConsent({ consentVersion: CONSENT_VERSION - 1 })).toBe(true);
  });

  it('refuses a phone hash that is not a digest and consent in the future', () => {
    expect(() =>
      createUser({ id: UserId('u1'), name: 'R', phoneHash: '+919999', consentAt: now, now }),
    ).toThrow(InvalidArgument);
    const future = new Date(now.getTime() + 10 * 60_000);
    expect(() =>
      createUser({ id: UserId('u1'), name: 'R', phoneHash: hash, consentAt: future, now }),
    ).toThrow(InvalidArgument);
  });

  it('has no field for a phone number, card number, limit or spend (the phone lives in ContactRecord, server-only)', () => {
    const u = createUser({ id: UserId('u1'), name: 'Raja', phoneHash: hash, consentAt: now, now });
    expect(Object.keys(u).sort()).toEqual([
      'consentAt',
      'consentVersion',
      'createdAt',
      'id',
      'name',
      'phoneHash',
    ]);
  });
});
