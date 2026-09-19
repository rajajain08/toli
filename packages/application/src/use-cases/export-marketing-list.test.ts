import { CardId, CONSENT_VERSION, parsePhone, UserCard, UserCardId, UserId } from '@toli/domain';
import { describe, expect, it } from 'vitest';
import {
  FakePhoneHasher,
  FixedClock,
  InMemoryContactRepository,
  InMemoryUserCardRepository,
  InMemoryUserRepository,
} from '../testing';
import { SetMarketingOptIn } from './account';
import { CompleteSignup } from './complete-signup';
import { ExportMarketingList, marketingCsv } from './export-marketing-list';

const catalog = {
  get: (id: string) =>
    ({
      'hdfc-millennia': { name: 'Millennia', issuer: 'HDFC', color: '#000000', tags: [] },
      'axis-atlas': { name: 'Atlas', issuer: 'Axis', color: '#000000', tags: [] },
    })[id],
};

const world = async () => {
  const users = new InMemoryUserRepository();
  const contacts = new InMemoryContactRepository();
  const cards = new InMemoryUserCardRepository();
  const clock = new FixedClock();
  const signup = new CompleteSignup(users, contacts, new FakePhoneHasher(), clock);
  const join = (id: string, name: string, phone: string, marketingOptIn: boolean) =>
    signup.execute({
      actor: UserId(id),
      phone: parsePhone(phone),
      name,
      consent: true,
      marketingOptIn,
    });
  const hold = (owner: string, ucId: string, cardId: string) =>
    cards.save(
      UserCard.create({
        id: UserCardId(ucId),
        ownerId: UserId(owner),
        cardId: CardId(cardId),
        now: clock.now(),
      }),
    );
  return {
    users,
    contacts,
    cards,
    clock,
    join,
    hold,
    exporter: new ExportMarketingList(contacts, users, cards, catalog),
  };
};

describe('ExportMarketingList', () => {
  it('lists only people who said yes, with their name, phone and card names', async () => {
    const w = await world();
    await w.join('u1', 'Priya', '9876543211', true);
    await w.join('u2', 'Rahul', '9876543212', false);
    await w.join('u3', 'Asha', '9876543213', true);
    await w.hold('u1', 'c1', 'hdfc-millennia');
    await w.hold('u1', 'c2', 'axis-atlas');
    await w.hold('u1', 'c3', 'not-in-catalogue');
    await w.hold('u2', 'c4', 'axis-atlas');

    const { rows, skipped } = await w.exporter.execute();
    expect(rows.map((r) => r.name)).toEqual(['Asha', 'Priya']);
    expect(rows[1]).toMatchObject({
      phone: '+919876543211',
      cards: ['Axis Atlas', 'HDFC Millennia'],
    });
    expect(rows[0]!.cards).toEqual([]);
    expect(JSON.stringify(rows)).not.toContain('9876543212');
    expect(skipped).toEqual({ noProfile: 0, consentOutdated: 0 });
  });

  it('stops listing someone the moment they switch marketing off', async () => {
    const w = await world();
    await w.join('u1', 'Priya', '9876543211', true);
    await new SetMarketingOptIn(w.contacts, w.clock).execute({ actor: UserId('u1'), optIn: false });
    expect((await w.exporter.execute()).rows).toEqual([]);
  });

  it('leaves out a contact with no profile and one whose consent is on an older text, and says how many', async () => {
    const w = await world();
    await w.join('gone', 'Ghost', '9876543211', true);
    await w.join('old', 'Old Timer', '9876543212', true);
    await w.join('ok', 'Fine', '9876543213', true);
    await w.users.remove(UserId('gone'));
    await w.users.upsert({
      ...(await w.users.get(UserId('old')))!,
      consentVersion: CONSENT_VERSION - 1,
    });
    const { rows, skipped } = await w.exporter.execute();
    expect(rows.map((r) => r.name)).toEqual(['Fine']);
    expect(skipped).toEqual({ noProfile: 1, consentOutdated: 1 });
  });
});

describe('marketingCsv', () => {
  const at = new Date('2026-09-19T10:00:00Z');
  it('writes a header and one line per person', () => {
    const csv = marketingCsv([
      {
        userId: UserId('u1'),
        name: 'Priya',
        phone: '+919876543211',
        optedInAt: at,
        cards: ['Axis Atlas', 'HDFC Millennia'],
      },
    ]);
    expect(csv).toBe(
      'name,phone,opted_in_at,cards\nPriya,+919876543211,2026-09-19T10:00:00.000Z,Axis Atlas; HDFC Millennia\n',
    );
  });
  it('quotes commas and quotes, and defuses spreadsheet formulas in names', () => {
    const csv = marketingCsv([
      { userId: UserId('u1'), name: 'Rao, "RJ"', phone: '+911', optedInAt: at, cards: [] },
      {
        userId: UserId('u2'),
        name: '=HYPERLINK("http://evil","x")',
        phone: '+912',
        optedInAt: at,
        cards: [],
      },
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[1]).toBe('"Rao, ""RJ""",+911,2026-09-19T10:00:00.000Z,');
    expect(lines[2]!.startsWith('"\'=HYPERLINK(')).toBe(true);
  });
});
