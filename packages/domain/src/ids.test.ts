import { describe, expect, it } from 'vitest';
import { GroupId, UserId } from './ids';

describe('ids', () => {
  it('rejects empty strings', () => {
    expect(() => UserId('')).toThrow(TypeError);
    expect(() => GroupId('')).toThrow(TypeError);
  });
  it('keeps the string value', () => {
    expect(UserId('abc')).toBe('abc');
  });
});
