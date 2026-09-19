import {
  AudienceFull,
  CardId,
  createUser,
  GroupId,
  InvalidArgument,
  InvalidInvite,
  LimitExceeded,
  LIMITS,
  NotAMember,
  NotFound,
  RateLimited,
  UserCardId,
  UserId,
  type User,
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
import { CreateAudience, MAX_AUDIENCES_PER_USER } from './create-audience';
import { CreateInvite } from './create-invite';
import { GetInvitePreview } from './get-invite-preview';
import { JoinByInvite } from './join-by-invite';
import { ListAudienceCards } from './list-audience-cards';
import { ProjectUserCard } from './project-user-card';

const DAY = 24 * 60 * 60 * 1000;
const rahul = UserId('rahul');
const priya = UserId('priya');
const stranger = UserId('stranger');

const catalog = {
  get: (id: string) =>
    ({
      'axis-atlas': { name: 'Atlas', issuer: 'Axis', color: '#1D3557', tags: ['travel', 'lounge'] },
      'hdfc-millennia': { name: 'Millennia', issuer: 'HDFC', color: '#2E6F8E', tags: ['cashback'] },
    })[id],
};

const world = async (limiterMax = 5) => {
  const clock = new FixedClock();
  const users = new InMemoryUserRepository();
  const audiences = new InMemoryAudienceRepository();
  const invites = new InMemoryInviteRepository();
  const readModel = new InMemoryGroupCardReadModel();
  const limiter = new InMemoryRateLimiter(limiterMax);
  const ids = new SequentialIds('g');
  const person = (id: UserId, name: string): User =>
    createUser({ id, name, phoneHash: 'h'.repeat(64), consentAt: clock.now(), now: clock.now() });
  for (const [id, name] of [
    [rahul, 'Rahul'],
    [priya, 'Priya'],
    [stranger, 'Stranger'],
  ] as const)
    await users.upsert(person(id, name));
  return {
    clock,
    users,
    audiences,
    invites,
    readModel,
    limiter,
    person,
    createAudience: new CreateAudience(audiences, users, ids, clock),
    createInvite: new CreateInvite(audiences, invites, ids, clock),
    join: new JoinByInvite(audiences, invites, users, limiter, clock),
    preview: new GetInvitePreview(invites, audiences, users, clock),
    project: new ProjectUserCard(readModel, audiences, users, catalog),
    list: new ListAudienceCards(readModel, audiences),
  };
};

describe('CreateAudience', () => {
  it('creates a group with the actor as owner and first member', async () => {
    const w = await world();
    const g = await w.createAudience.execute({ actor: rahul, name: '  Weekend   Crew ' });
    expect(g.name).toBe('Weekend Crew');
    expect(g.type).toBe('group');
    expect(g.memberCount).toBe(1);
    expect(await w.audiences.isMember(g.id, rahul)).toBe(true);
    expect(w.audiences.members.get(g.id)!.get(rahul)).toMatchObject({
      role: 'owner',
      name: 'Rahul',
    });
  });
  it('needs a profile and a real name', async () => {
    const w = await world();
    await expect(w.createAudience.execute({ actor: UserId('ghost'), name: 'x' })).rejects.toThrow(
      NotFound,
    );
    await expect(w.createAudience.execute({ actor: rahul, name: '   ' })).rejects.toThrow(
      InvalidArgument,
    );
  });
  it('caps how many audiences one person can be in', async () => {
    const w = await world();
    for (let i = 0; i < MAX_AUDIENCES_PER_USER; i++)
      await w.createAudience.execute({ actor: rahul, name: `g${i}` });
    await expect(w.createAudience.execute({ actor: rahul, name: 'one more' })).rejects.toThrow(
      LimitExceeded,
    );
  });
});

describe('CreateInvite', () => {
  it('lets a member mint an 8-character code with a 7-day life', async () => {
    const w = await world();
    const g = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    const inv = await w.createInvite.execute({ actor: rahul, audienceId: g.id });
    expect(inv.code).toMatch(/^[A-HJKMNP-TV-Z0-9]{8}$/);
    expect(inv.expiresAt.getTime() - w.clock.now().getTime()).toBe(LIMITS.inviteTtlMs);
    expect(await w.invites.get(inv.code)).toBeDefined();
  });
  it('refuses a non-member and an unknown group', async () => {
    const w = await world();
    const g = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    await expect(w.createInvite.execute({ actor: stranger, audienceId: g.id })).rejects.toThrow(
      NotAMember,
    );
    await expect(
      w.createInvite.execute({ actor: rahul, audienceId: GroupId('nope') }),
    ).rejects.toThrow(NotFound);
  });
});

describe('JoinByInvite', () => {
  const setup = async (limiterMax?: number) => {
    const w = await world(limiterMax);
    const g = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    const inv = await w.createInvite.execute({ actor: rahul, audienceId: g.id });
    return { ...w, g, inv };
  };

  it('joins, records one use and keeps the count right', async () => {
    const w = await setup();
    const res = await w.join.execute({ actor: priya, code: w.inv.code.toLowerCase() });
    expect(res.alreadyMember).toBe(false);
    expect(res.audience.memberCount).toBe(2);
    expect(await w.audiences.isMember(w.g.id, priya)).toBe(true);
    expect((await w.invites.get(w.inv.code))!.uses).toBe(1);
    expect(w.audiences.members.get(w.g.id)!.get(priya)).toMatchObject({
      role: 'member',
      name: 'Priya',
    });
  });

  it('is idempotent: joining again does not burn a use', async () => {
    const w = await setup();
    await w.join.execute({ actor: priya, code: w.inv.code });
    const again = await w.join.execute({ actor: priya, code: w.inv.code });
    expect(again.alreadyMember).toBe(true);
    expect((await w.invites.get(w.inv.code))!.uses).toBe(1);
    expect((await w.audiences.get(w.g.id))!.memberCount).toBe(2);
  });

  it('rejects malformed, unknown, expired and exhausted codes', async () => {
    const w = await setup(100);
    await expect(w.join.execute({ actor: priya, code: 'short' })).rejects.toThrow(InvalidInvite);
    await expect(w.join.execute({ actor: priya, code: 'ZZZZZZZZ' })).rejects.toThrow(InvalidInvite);
    w.clock.advance(7 * DAY);
    await expect(w.join.execute({ actor: priya, code: w.inv.code })).rejects.toThrow(
      expect.objectContaining({ reason: 'expired' }),
    );
  });

  it('rate limits before looking anything up, so codes cannot be probed', async () => {
    const w = await setup(3);
    for (let i = 0; i < 3; i++)
      await expect(w.join.execute({ actor: stranger, code: 'ZZZZZZZZ' })).rejects.toThrow(
        InvalidInvite,
      );
    await expect(w.join.execute({ actor: stranger, code: w.inv.code })).rejects.toThrow(
      RateLimited,
    );
    expect(await w.audiences.isMember(w.g.id, stranger)).toBe(false);
  });

  it('holds 50 members and not one more', async () => {
    const w = await setup(1000);
    for (let i = 0; i < LIMITS.membersPerAudience - 1; i++) {
      const id = UserId(`m${i}`);
      await w.users.upsert(w.person(id, `M${i}`));
      const inv = await w.createInvite.execute({ actor: rahul, audienceId: w.g.id });
      await w.join.execute({ actor: id, code: inv.code });
    }
    expect((await w.audiences.get(w.g.id))!.memberCount).toBe(50);
    const last = await w.createInvite.execute({ actor: rahul, audienceId: w.g.id });
    await expect(w.join.execute({ actor: priya, code: last.code })).rejects.toThrow(AudienceFull);
    expect((await w.invites.get(last.code))!.uses).toBe(0);
  });
});

describe('GetInvitePreview', () => {
  it('shows the group name, who started it and counts, nothing about members or cards', async () => {
    const w = await world();
    const g = await w.createAudience.execute({ actor: rahul, name: 'Weekend Crew' });
    const inv = await w.createInvite.execute({ actor: rahul, audienceId: g.id });
    expect(await w.preview.execute({ code: inv.code })).toEqual({
      groupName: 'Weekend Crew',
      inviterName: 'Rahul',
      memberCount: 1,
      cardCount: 0,
    });
  });
  it('says one thing for malformed, unknown and expired codes', async () => {
    const w = await world();
    const g = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    const inv = await w.createInvite.execute({ actor: rahul, audienceId: g.id });
    expect(await w.preview.execute({ code: '!!' })).toBeUndefined();
    expect(await w.preview.execute({ code: 'ZZZZZZZZ' })).toBeUndefined();
    w.clock.advance(8 * DAY);
    expect(await w.preview.execute({ code: inv.code })).toBeUndefined();
  });
});

describe('ProjectUserCard', () => {
  const uc = UserCardId('uc1');
  const snap = (visibleTo: GroupId[]) => ({
    cardId: CardId('axis-atlas'),
    visibleTo,
    addedAt: new Date('2026-09-01'),
  });
  const setup = async () => {
    const w = await world();
    const g1 = await w.createAudience.execute({ actor: rahul, name: 'One' });
    const g2 = await w.createAudience.execute({ actor: rahul, name: 'Two' });
    return { ...w, g1, g2 };
  };

  it('projects a denormalised row into each added audience', async () => {
    const w = await setup();
    const res = await w.project.execute({
      ownerId: rahul,
      userCardId: uc,
      before: snap([]),
      after: snap([w.g1.id, w.g2.id]),
    });
    expect(res.projected).toEqual([w.g1.id, w.g2.id]);
    const [row] = await w.readModel.listByAudience(w.g1.id);
    expect(row).toMatchObject({
      ownerId: rahul,
      ownerName: 'Rahul',
      cardId: 'axis-atlas',
      name: 'Atlas',
      issuer: 'Axis',
      tags: ['travel', 'lounge'],
    });
    expect(w.readModel.counts.get(w.g1.id)).toBe(1);
  });

  it('removes rows when visibility is withdrawn and when the card is deleted', async () => {
    const w = await setup();
    await w.project.execute({
      ownerId: rahul,
      userCardId: uc,
      before: undefined,
      after: snap([w.g1.id, w.g2.id]),
    });
    await w.project.execute({
      ownerId: rahul,
      userCardId: uc,
      before: snap([w.g1.id, w.g2.id]),
      after: snap([w.g2.id]),
    });
    expect(await w.readModel.listByAudience(w.g1.id)).toHaveLength(0);
    expect(w.readModel.counts.get(w.g1.id)).toBe(0);
    await w.project.execute({
      ownerId: rahul,
      userCardId: uc,
      before: snap([w.g2.id]),
      after: undefined,
    });
    expect(await w.readModel.listByAudience(w.g2.id)).toHaveLength(0);
    expect(w.readModel.counts.get(w.g2.id)).toBe(0);
  });

  it('tolerates redelivery: the same event twice changes nothing, counters included', async () => {
    const w = await setup();
    const add = { ownerId: rahul, userCardId: uc, before: snap([]), after: snap([w.g1.id]) };
    await w.project.execute(add);
    await w.project.execute(add);
    expect(await w.readModel.listByAudience(w.g1.id)).toHaveLength(1);
    expect(w.readModel.counts.get(w.g1.id)).toBe(1);
    const del = { ownerId: rahul, userCardId: uc, before: snap([w.g1.id]), after: snap([]) };
    await w.project.execute(del);
    await w.project.execute(del);
    expect(w.readModel.counts.get(w.g1.id)).toBe(0);
  });

  it('refuses to project into a group the owner is not in, even though the client wrote its id', async () => {
    const w = await setup();
    const theirs = await w.createAudience.execute({ actor: priya, name: 'Priya only' });
    const res = await w.project.execute({
      ownerId: rahul,
      userCardId: uc,
      before: snap([]),
      after: snap([theirs.id, w.g1.id]),
    });
    expect(res.refused).toEqual([theirs.id]);
    expect(res.projected).toEqual([w.g1.id]);
    expect(await w.readModel.listByAudience(theirs.id)).toHaveLength(0);
  });

  it('skips a card that is not in the catalogue', async () => {
    const w = await setup();
    const res = await w.project.execute({
      ownerId: rahul,
      userCardId: uc,
      before: undefined,
      after: { cardId: CardId('made-up'), visibleTo: [w.g1.id], addedAt: new Date() },
    });
    expect(res.projected).toEqual([]);
    expect(res.refused).toEqual([w.g1.id]);
  });
});

describe('ListAudienceCards', () => {
  it('lists a group for a member, grouped by person, and refuses a non-member', async () => {
    const w = await world();
    const g = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    const inv = await w.createInvite.execute({ actor: rahul, audienceId: g.id });
    await w.join.execute({ actor: priya, code: inv.code });
    const at = (d: string) => ({ visibleTo: [g.id], addedAt: new Date(d) });
    await w.project.execute({
      ownerId: rahul,
      userCardId: UserCardId('r1'),
      before: undefined,
      after: { cardId: CardId('axis-atlas'), ...at('2026-09-01') },
    });
    await w.project.execute({
      ownerId: priya,
      userCardId: UserCardId('p1'),
      before: undefined,
      after: { cardId: CardId('hdfc-millennia'), ...at('2026-09-02') },
    });
    const rows = await w.list.execute({ actor: priya, audienceId: g.id });
    expect(rows.map((r) => `${r.ownerName}:${r.name}`)).toEqual(['Priya:Millennia', 'Rahul:Atlas']);
    await expect(w.list.execute({ actor: stranger, audienceId: g.id })).rejects.toThrow(NotAMember);
  });
});
