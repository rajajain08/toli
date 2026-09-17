import { describe, expect, it } from 'vitest';
import { HmacPhoneHasher } from './phone-hasher';

describe('HmacPhoneHasher', () => {
  it('is deterministic per secret and never contains the phone', () => {
    const h = new HmacPhoneHasher('local-dev-secret-change-me');
    const a = h.hash('+919876543210');
    expect(a).toBe(h.hash('+919876543210'));
    expect(a).toHaveLength(64);
    expect(a).not.toContain('9876543210');
    expect(new HmacPhoneHasher('another-secret-of-length').hash('+919876543210')).not.toBe(a);
  });
  it('refuses a weak secret', () => {
    expect(() => new HmacPhoneHasher('short')).toThrow();
  });
});
