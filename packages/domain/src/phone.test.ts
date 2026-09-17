import { describe, expect, it } from 'vitest';
import { InvalidArgument } from './errors';
import { maskPhone, parsePhone } from './phone';

describe('parsePhone', () => {
  it('normalises Indian mobiles typed in every common shape', () => {
    for (const raw of [
      '98765 43210',
      '9876543210',
      '09876543210',
      '+91 98765-43210',
      '919876543210',
      '0091 9876543210',
    ])
      expect(parsePhone(raw)).toBe('+919876543210');
  });
  it('accepts other E.164 numbers with a country code', () => {
    expect(parsePhone('+1 (415) 555-2671')).toBe('+14155552671');
  });
  it('rejects junk and Indian numbers that cannot be mobiles', () => {
    for (const raw of ['', '12345', 'abc', '+91 12345 67890', '+0123456789', '1234567890'])
      expect(() => parsePhone(raw)).toThrow(InvalidArgument);
  });
  it('masks all but the last two digits', () => {
    expect(maskPhone(parsePhone('9876543210'))).toBe('••••• •••10');
  });
});
