import { InvalidArgument, parsePhone, UserId } from '@toli/domain';
import { describe, expect, it } from 'vitest';
import { FakePhoneHasher, FixedClock, InMemoryUserRepository } from '../testing';
import { CompleteSignup } from './complete-signup';

const phone = parsePhone('9876543210');
const setup = () => {
  const users = new InMemoryUserRepository();
  const clock = new FixedClock();
  const uc = new CompleteSignup(users, new FakePhoneHasher(), clock);
  return { users, clock, uc };
};

describe('CompleteSignup', () => {
  it('creates the profile with consent and an HMAC, never the phone', async () => {
    const { users, uc, clock } = setup();
    const u = await uc.execute({ actor: UserId('u1'), phone, name: ' Raja  Jain ', consent: true });
    expect(u.name).toBe('Raja Jain');
    expect(u.consentAt).toEqual(clock.now());
    expect(u.phoneHash).toBe(FakePhoneHasher.hashOf(phone));
    expect(JSON.stringify(users.users.get(UserId('u1')))).not.toContain('9876543210');
  });

  it('refuses without consent', async () => {
    const { uc, users } = setup();
    await expect(
      uc.execute({ actor: UserId('u1'), phone, name: 'R', consent: false }),
    ).rejects.toThrow(InvalidArgument);
    expect(users.users.size).toBe(0);
  });

  it('is idempotent: keeps consent and creation time, refreshes the name', async () => {
    const { uc, clock } = setup();
    const first = await uc.execute({ actor: UserId('u1'), phone, name: 'Raja', consent: true });
    clock.advance(60_000);
    const second = await uc.execute({ actor: UserId('u1'), phone, name: 'Raja J', consent: true });
    expect(second.name).toBe('Raja J');
    expect(second.consentAt).toEqual(first.consentAt);
    expect(second.createdAt).toEqual(first.createdAt);
  });

  it('validates the name', async () => {
    const { uc } = setup();
    await expect(
      uc.execute({ actor: UserId('u1'), phone, name: '  ', consent: true }),
    ).rejects.toThrow(InvalidArgument);
  });
});
