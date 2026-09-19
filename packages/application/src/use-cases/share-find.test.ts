import {
  Audience,
  CardId,
  createUser,
  InvalidArgument,
  NotConnected,
  NotFound,
  RateLimited,
  UserCardId,
  UserId,
  type GroupId,
} from '@toli/domain';
import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryAudienceRepository,
  InMemoryGroupCardReadModel,
  InMemoryInviteRepository,
  InMemoryRateLimiter,
  InMemoryUserRepository,
  SequentialIds,
} from '../testing';
import { CreateAudience } from './create-audience';
import { CreateInvite } from './create-invite';
import { FindCardHolders } from './find-card-holders';
import { JoinByInvite } from './join-by-invite';
import { ProjectUserCard } from './project-user-card';
import { ShareWith } from './share-with';

const rahul = UserId('rahul');
const priya = UserId('priya');
const karan = UserId('karan');
const stranger = UserId('stranger');

const catalog = {
  get: (id: string) =>
    ({
      'axis-atlas': { name: 'Atlas', issuer: 'Axis', color: '#1D3557', tags: ['travel', 'lounge'] },
      'hdfc-millennia': { name: 'Millennia', issuer: 'HDFC', color: '#2E6F8E', tags: ['cashback'] },
      'sbi-elite': {
        name: 'SBI Card ELITE',
        issuer: 'SBI',
        color: '#1B2A4A',
        tags: ['lounge', 'movies'],
      },
    })[id],
};

const world = async (shareLimit = 50) => {
  const clock = new FixedClock();
  const users = new InMemoryUserRepository();
  const audiences = new InMemoryAudienceRepository();
  const invites = new InMemoryInviteRepository();
  const readModel = new InMemoryGroupCardReadModel();
  const ids = new SequentialIds('g');
  for (const [id, name] of [
    [rahul, 'Rahul'],
    [priya, 'Priya'],
    [karan, 'Karan'],
    [stranger, 'Stranger'],
  ] as const)
    await users.upsert(
      createUser({ id, name, phoneHash: 'h'.repeat(64), consentAt: clock.now(), now: clock.now() }),
    );
  const createAudience = new CreateAudience(audiences, users, ids, clock);
  const createInvite = new CreateInvite(audiences, invites, ids, clock);
  const join = new JoinByInvite(audiences, invites, users, new InMemoryRateLimiter(1000), clock);
  const project = new ProjectUserCard(readModel, audiences, users, catalog);
  const groupOf = async (owner: UserId, name: string, ...others: UserId[]) => {
    const g = await createAudience.execute({ actor: owner, name });
    for (const o of others)
      await join.execute({
        actor: o,
        code: (await createInvite.execute({ actor: owner, audienceId: g.id })).code,
      });
    return g;
  };
  let n = 0;
  const hold = (owner: UserId, cardId: string, ...visibleTo: GroupId[]) =>
    project.execute({
      ownerId: owner,
      userCardId: UserCardId(`uc${n++}`),
      before: undefined,
      after: { cardId: CardId(cardId), visibleTo, addedAt: clock.now() },
    });
  return {
    audiences,
    readModel,
    groupOf,
    hold,
    share: new ShareWith(audiences, users, new InMemoryRateLimiter(shareLimit), clock),
    find: new FindCardHolders(readModel, audiences),
  };
};

describe('ShareWith', () => {
  it('opens a two-member direct audience with a deterministic id, named after the other person on each side', async () => {
    const w = await world();
    await w.groupOf(rahul, 'Crew', priya);
    const res = await w.share.execute({ actor: priya, target: rahul });
    expect(res.created).toBe(true);
    expect(res.audience.id).toBe('direct_priya_rahul');
    expect(res.audience.type).toBe('direct');
    expect(res.audience.memberCount).toBe(2);
    expect(await w.audiences.isMember(res.audience.id, rahul)).toBe(true);
    expect(await w.audiences.isMember(res.audience.id, priya)).toBe(true);
    expect(w.audiences.labels.get(`priya/${res.audience.id}`)).toBe('Rahul');
    expect(w.audiences.labels.get(`rahul/${res.audience.id}`)).toBe('Priya');
  });

  it('can never exist twice, whoever starts it', async () => {
    const w = await world();
    await w.groupOf(rahul, 'Crew', priya);
    const first = await w.share.execute({ actor: priya, target: rahul });
    const again = await w.share.execute({ actor: rahul, target: priya });
    expect(again.created).toBe(false);
    expect(again.audience.id).toBe(first.audience.id);
    expect(again.audience.createdBy).toBe(priya);
  });

  it('only with someone who is in one of your groups', async () => {
    const w = await world();
    await w.groupOf(rahul, 'Crew', priya);
    await expect(w.share.execute({ actor: rahul, target: stranger })).rejects.toThrow(NotConnected);
    await expect(w.share.execute({ actor: stranger, target: rahul })).rejects.toThrow(NotConnected);
    expect(await w.audiences.get(Audience.directId(rahul, stranger))).toBeUndefined();
  });

  it('a shared 1:1 does not count as a connection to a third person', async () => {
    const w = await world();
    await w.groupOf(rahul, 'Crew', priya);
    await w.groupOf(priya, 'Office', karan);
    await w.share.execute({ actor: rahul, target: priya });
    await expect(w.share.execute({ actor: rahul, target: karan })).rejects.toThrow(NotConnected);
  });

  it('refuses yourself, unknown people, and too many attempts', async () => {
    const w = await world(2);
    await w.groupOf(rahul, 'Crew', priya);
    await expect(w.share.execute({ actor: rahul, target: rahul })).rejects.toThrow(InvalidArgument);
    await expect(w.share.execute({ actor: rahul, target: UserId('ghost') })).rejects.toThrow(
      NotFound,
    );
    await w.share.execute({ actor: rahul, target: priya });
    await expect(w.share.execute({ actor: rahul, target: priya })).rejects.toThrow(RateLimited);
  });
});

describe('FindCardHolders', () => {
  const setup = async () => {
    const w = await world();
    const crew = await w.groupOf(rahul, 'Weekend Crew', priya);
    const office = await w.groupOf(karan, 'Office lunch', rahul);
    const direct = (await w.share.execute({ actor: priya, target: rahul })).audience;
    return { ...w, crew, office, direct };
  };

  it('finds who holds a card across groups and 1:1 shares, never yourself', async () => {
    const w = await setup();
    await w.hold(priya, 'axis-atlas', w.crew.id);
    await w.hold(karan, 'axis-atlas', w.office.id);
    await w.hold(rahul, 'axis-atlas', w.crew.id, w.office.id);
    const holders = await w.find.execute({ actor: rahul, cardId: CardId('axis-atlas') });
    expect(holders.map((h) => h.ownerName)).toEqual(['Karan', 'Priya']);
    expect(holders[1]!.via).toEqual([
      { audienceId: w.crew.id, type: 'group', name: 'Weekend Crew' },
    ]);
  });

  it('lists a person once, with every way you know them', async () => {
    const w = await setup();
    await w.hold(priya, 'axis-atlas', w.crew.id, w.direct.id);
    const [holder, ...rest] = await w.find.execute({ actor: rahul, cardId: CardId('axis-atlas') });
    expect(rest).toHaveLength(0);
    expect(holder!.via.map((v) => v.type).sort()).toEqual(['direct', 'group']);
    expect(holder!.via.find((v) => v.type === 'direct')!.name).toBeUndefined();
  });

  it('does not see cards in audiences you are not in', async () => {
    const w = await setup();
    await w.hold(karan, 'axis-atlas', w.office.id);
    expect(await w.find.execute({ actor: priya, cardId: CardId('axis-atlas') })).toEqual([]);
    expect(await w.find.execute({ actor: stranger, cardId: CardId('axis-atlas') })).toEqual([]);
  });

  it('finds by perk, most-held card first', async () => {
    const w = await setup();
    await w.hold(priya, 'axis-atlas', w.crew.id);
    await w.hold(karan, 'axis-atlas', w.office.id);
    await w.hold(karan, 'sbi-elite', w.office.id);
    await w.hold(priya, 'hdfc-millennia', w.crew.id);
    const lounge = await w.find.byTag({ actor: rahul, tag: 'lounge' });
    expect(lounge.map((c) => `${c.name}:${c.holders.length}`)).toEqual([
      'Atlas:2',
      'SBI Card ELITE:1',
    ]);
    expect(await w.find.byTag({ actor: rahul, tag: 'fuel' })).toEqual([]);
  });
});
