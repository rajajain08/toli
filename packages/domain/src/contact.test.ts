import { describe, expect, it } from 'vitest';
import { upsertContact } from './contact';
import { UserId } from './ids';
import { parsePhone } from './phone';

const phone = parsePhone('9876543210');
const t0 = new Date('2026-09-19T00:00:00Z');
const t1 = new Date('2026-09-20T00:00:00Z');
const base = { userId: UserId('u1'), phone };

describe('ContactRecord', () => {
  it('is opted out unless the person says otherwise', () => {
    const c = upsertContact({ ...base, existing: undefined, marketingOptIn: false, now: t0 });
    expect(c.marketingOptIn).toBe(false);
    expect(c.marketingOptInAt).toBeUndefined();
    expect(c.phone).toBe('+919876543210');
  });
  it('dates an opt-in once and keeps that date on repeat calls', () => {
    const first = upsertContact({ ...base, existing: undefined, marketingOptIn: true, now: t0 });
    const again = upsertContact({ ...base, existing: first, marketingOptIn: true, now: t1 });
    expect(again.marketingOptInAt).toEqual(t0);
    expect(again.updatedAt).toEqual(t1);
  });
  it('clears the date on opt-out and re-dates a later opt-in', () => {
    const inn = upsertContact({ ...base, existing: undefined, marketingOptIn: true, now: t0 });
    const out = upsertContact({ ...base, existing: inn, marketingOptIn: false, now: t1 });
    expect(out.marketingOptInAt).toBeUndefined();
    const back = upsertContact({ ...base, existing: out, marketingOptIn: true, now: t1 });
    expect(back.marketingOptInAt).toEqual(t1);
  });
});
