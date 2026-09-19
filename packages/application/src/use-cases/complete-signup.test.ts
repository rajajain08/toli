import { InvalidArgument, parsePhone, UserId } from '@toli/domain';
import { describe, expect, it } from 'vitest';
import {
  FakePhoneHasher,
  FixedClock,
  InMemoryContactRepository,
  InMemoryUserRepository,
} from '../testing';
import { CompleteSignup } from './complete-signup';

const phone = parsePhone('9876543210');
const u1 = UserId('u1');
const setup = () => {
  const users = new InMemoryUserRepository();
  const contacts = new InMemoryContactRepository();
  const clock = new FixedClock();
  const uc = new CompleteSignup(users, contacts, new FakePhoneHasher(), clock);
  return { users, contacts, clock, uc };
};
const cmd = { actor: u1, phone, name: 'Raja', consent: true, marketingOptIn: false };

describe('CompleteSignup', () => {
  it('creates the profile with consent and an HMAC; the profile itself never holds the phone', async () => {
    const { users, uc, clock } = setup();
    const u = await uc.execute({ ...cmd, name: ' Raja  Jain ' });
    expect(u.name).toBe('Raja Jain');
    expect(u.consentAt).toEqual(clock.now());
    expect(u.phoneHash).toBe(FakePhoneHasher.hashOf(phone));
    expect(JSON.stringify(users.users.get(u1))).not.toContain('9876543210');
  });

  it('stores the verified phone in the server-only contact record, opted out by default', async () => {
    const { contacts, uc } = setup();
    await uc.execute(cmd);
    const c = contacts.contacts.get(u1)!;
    expect(c.phone).toBe('+919876543210');
    expect(c.marketingOptIn).toBe(false);
    expect(c.marketingOptInAt).toBeUndefined();
  });

  it('records a marketing opt-in with its own timestamp, and lets it be withdrawn', async () => {
    const { contacts, uc, clock } = setup();
    await uc.execute({ ...cmd, marketingOptIn: true });
    expect(contacts.contacts.get(u1)!.marketingOptInAt).toEqual(clock.now());
    clock.advance(60_000);
    await uc.execute({ ...cmd, marketingOptIn: false });
    expect(contacts.contacts.get(u1)!.marketingOptIn).toBe(false);
    expect(contacts.contacts.get(u1)!.marketingOptInAt).toBeUndefined();
  });

  it('refuses without consent and stores nothing, not even the phone', async () => {
    const { uc, users, contacts } = setup();
    await expect(uc.execute({ ...cmd, consent: false, marketingOptIn: true })).rejects.toThrow(
      InvalidArgument,
    );
    expect(users.users.size).toBe(0);
    expect(contacts.contacts.size).toBe(0);
  });

  it('is idempotent: keeps consent and creation time, refreshes the name', async () => {
    const { uc, clock } = setup();
    const first = await uc.execute(cmd);
    clock.advance(60_000);
    const second = await uc.execute({ ...cmd, name: 'Raja J' });
    expect(second.name).toBe('Raja J');
    expect(second.consentAt).toEqual(first.consentAt);
    expect(second.createdAt).toEqual(first.createdAt);
  });

  it('validates the name before writing anything', async () => {
    const { uc, contacts } = setup();
    await expect(uc.execute({ ...cmd, name: '  ' })).rejects.toThrow(InvalidArgument);
    expect(contacts.contacts.size).toBe(0);
  });
});
