import { describe, expect, it } from 'vitest';
import { isRecentSignIn, RECENT_SIGN_IN_SECONDS } from './recent-sign-in';

const now = new Date('2026-09-19T12:00:00Z');
const secondsAgo = (s: number) => now.getTime() / 1000 - s;

describe('isRecentSignIn', () => {
  it('accepts a sign-in from the last ten minutes', () => {
    expect(isRecentSignIn(secondsAgo(0), now)).toBe(true);
    expect(isRecentSignIn(secondsAgo(RECENT_SIGN_IN_SECONDS), now)).toBe(true);
  });
  it('refuses an older one, a missing one and a nonsensical one', () => {
    expect(isRecentSignIn(secondsAgo(RECENT_SIGN_IN_SECONDS + 1), now)).toBe(false);
    expect(isRecentSignIn(undefined, now)).toBe(false);
    expect(isRecentSignIn('1700000000', now)).toBe(false);
    expect(isRecentSignIn(0, now)).toBe(false);
    expect(isRecentSignIn(Number.NaN, now)).toBe(false);
  });
  it('tolerates a minute of clock skew but not a token from the future', () => {
    expect(isRecentSignIn(secondsAgo(-30), now)).toBe(true);
    expect(isRecentSignIn(secondsAgo(-3600), now)).toBe(false);
  });
});
