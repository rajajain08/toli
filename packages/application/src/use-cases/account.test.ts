import { CONSENT_VERSION, NotFound, parsePhone, UserId } from '@toli/domain';
import { describe, expect, it } from 'vitest';
import {
  FakePhoneHasher,
  FixedClock,
  InMemoryContactRepository,
  InMemoryUserRepository,
} from '../testing';
import { GetMyAccount, SetMarketingOptIn } from './account';
import { CompleteSignup } from './complete-signup';

const u1 = UserId('u1');
const phone = parsePhone('9876543210');
const setup = async (marketingOptIn = false) => {
  const users = new InMemoryUserRepository();
  const contacts = new InMemoryContactRepository();
  const clock = new FixedClock();
  const signup = new CompleteSignup(users, contacts, new FakePhoneHasher(), clock);
  await signup.execute({ actor: u1, phone, name: 'Raja', consent: true, marketingOptIn });
  return {
    users,
    contacts,
    clock,
    signup,
    account: new GetMyAccount(users, contacts),
    setOptIn: new SetMarketingOptIn(contacts, clock),
  };
};

describe('GetMyAccount', () => {
  it('shows the name, the marketing choice and only the last two digits of the phone', async () => {
    const w = await setup(true);
    const a = await w.account.execute({ actor: u1 });
    expect(a).toEqual({
      name: 'Raja',
      phoneMasked: '••••• •••10',
      marketingOptIn: true,
      needsConsent: false,
    });
    expect(JSON.stringify(a)).not.toContain('98765432');
  });
  it('flags an account that agreed to an older consent text, and one with no contact record', async () => {
    const w = await setup();
    const legacy = { ...(await w.users.get(u1))!, consentVersion: CONSENT_VERSION - 1 };
    await w.users.upsert(legacy);
    await w.contacts.remove(u1);
    expect(await w.account.execute({ actor: u1 })).toMatchObject({
      needsConsent: true,
      phoneMasked: undefined,
      marketingOptIn: false,
    });
    await expect(w.account.execute({ actor: UserId('ghost') })).rejects.toThrow(NotFound);
  });
});

describe('SetMarketingOptIn', () => {
  it('withdraws and gives consent, dating each new opt-in', async () => {
    const w = await setup(true);
    const given = w.contacts.contacts.get(u1)!.marketingOptInAt;
    w.clock.advance(60_000);
    expect(await w.setOptIn.execute({ actor: u1, optIn: false })).toEqual({
      marketingOptIn: false,
    });
    expect(w.contacts.contacts.get(u1)!.marketingOptInAt).toBeUndefined();
    w.clock.advance(60_000);
    await w.setOptIn.execute({ actor: u1, optIn: true });
    expect(w.contacts.contacts.get(u1)!.marketingOptInAt!.getTime()).toBeGreaterThan(
      given!.getTime(),
    );
    expect(w.contacts.contacts.get(u1)!.phone).toBe('+919876543210');
  });
  it('never creates a contact record: the phone only enters through sign-up consent', async () => {
    const w = await setup();
    await w.contacts.remove(u1);
    await expect(w.setOptIn.execute({ actor: u1, optIn: true })).rejects.toThrow(NotFound);
    expect(w.contacts.contacts.size).toBe(0);
  });
});

describe('CompleteSignup and consent versions', () => {
  it('re-dates consent when someone on an older text agrees to the current one, and captures the phone', async () => {
    const w = await setup();
    const first = (await w.users.get(u1))!;
    await w.users.upsert({ ...first, consentVersion: 1 });
    await w.contacts.remove(u1);
    w.clock.advance(86_400_000);
    const again = await w.signup.execute({
      actor: u1,
      phone,
      name: 'Raja',
      consent: true,
      marketingOptIn: true,
    });
    expect(again.consentVersion).toBe(CONSENT_VERSION);
    expect(again.consentAt.getTime()).toBeGreaterThan(first.consentAt.getTime());
    expect(again.createdAt).toEqual(first.createdAt);
    expect(w.contacts.contacts.get(u1)).toMatchObject({
      phone: '+919876543210',
      marketingOptIn: true,
    });
  });
  it('leaves the consent date alone for someone already current', async () => {
    const w = await setup();
    const first = (await w.users.get(u1))!;
    w.clock.advance(86_400_000);
    const again = await w.signup.execute({
      actor: u1,
      phone,
      name: 'Raja J',
      consent: true,
      marketingOptIn: false,
    });
    expect(again.consentAt).toEqual(first.consentAt);
  });
});
