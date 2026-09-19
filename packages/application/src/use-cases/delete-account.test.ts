import {
  Audience,
  CardId,
  createUser,
  parsePhone,
  UserCard,
  UserCardId,
  UserId,
  type GroupId,
} from '@toli/domain';
import { describe, expect, it } from 'vitest';
import {
  FakePhoneHasher,
  FixedClock,
  InMemoryAudienceRepository,
  InMemoryContactRepository,
  InMemoryGroupCardReadModel,
  InMemoryIdentityGateway,
  InMemoryInviteRepository,
  InMemoryPurger,
  InMemoryRateLimiter,
  InMemoryUserCardRepository,
  InMemoryUserRepository,
  SequentialIds,
} from '../testing';
import { CompleteSignup } from './complete-signup';
import { CreateAudience } from './create-audience';
import { CreateInvite } from './create-invite';
import { DeleteAccount } from './delete-account';
import { JoinByInvite } from './join-by-invite';
import { ProjectUserCard } from './project-user-card';
import { ShareWith } from './share-with';

const rahul = UserId('rahul');
const priya = UserId('priya');
const catalog = {
  get: () => ({ name: 'Atlas', issuer: 'Axis', color: '#000000', tags: ['travel'] }),
};

const world = async () => {
  const clock = new FixedClock();
  const users = new InMemoryUserRepository();
  const cards = new InMemoryUserCardRepository();
  const audiences = new InMemoryAudienceRepository();
  const invites = new InMemoryInviteRepository();
  const readModel = new InMemoryGroupCardReadModel();
  const contacts = new InMemoryContactRepository();
  const purger = new InMemoryPurger();
  const identity = new InMemoryIdentityGateway();
  const ids = new SequentialIds('g');
  const signup = new CompleteSignup(users, contacts, new FakePhoneHasher(), clock);
  await signup.execute({
    actor: rahul,
    phone: parsePhone('9876543210'),
    name: 'Rahul',
    consent: true,
    marketingOptIn: true,
  });
  await signup.execute({
    actor: priya,
    phone: parsePhone('9876543211'),
    name: 'Priya',
    consent: true,
    marketingOptIn: false,
  });
  const createAudience = new CreateAudience(audiences, users, ids, clock);
  const createInvite = new CreateInvite(audiences, invites, ids, clock);
  const join = new JoinByInvite(audiences, invites, users, new InMemoryRateLimiter(100), clock);
  const project = new ProjectUserCard(readModel, audiences, users, catalog);
  const share = new ShareWith(audiences, users, new InMemoryRateLimiter(100), clock);
  const hold = async (owner: UserId, id: string, ...visibleTo: GroupId[]) => {
    let card = UserCard.create({
      id: UserCardId(id),
      ownerId: owner,
      cardId: CardId('axis-atlas'),
      now: clock.now(),
    });
    for (const a of visibleTo) card = card.show(a);
    await cards.save(card);
    await project.execute({
      ownerId: owner,
      userCardId: card.id,
      before: undefined,
      after: { cardId: card.cardId, visibleTo, addedAt: card.addedAt },
    });
  };
  return {
    users,
    cards,
    audiences,
    readModel,
    contacts,
    purger,
    identity,
    createAudience,
    createInvite,
    join,
    share,
    hold,
    del: new DeleteAccount(users, cards, audiences, readModel, contacts, purger, identity),
  };
};

describe('DeleteAccount', () => {
  it('takes the person off every friend’s screen, out of every audience, and erases their data, phone and identity', async () => {
    const w = await world();
    const crew = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    await w.join.execute({
      actor: priya,
      code: (await w.createInvite.execute({ actor: rahul, audienceId: crew.id })).code,
    });
    const direct = (await w.share.execute({ actor: priya, target: rahul })).audience;
    await w.hold(priya, 'p1', crew.id, direct.id);
    await w.hold(priya, 'p2');
    await w.hold(rahul, 'r1', crew.id);

    const res = await w.del.execute({ actor: priya });
    expect(res).toEqual({ cardsRemoved: 2, audiencesLeft: 1, audiencesDeleted: 1 });

    // Friends: her card is gone from the group, the counter followed, Rahul's is untouched.
    expect((await w.readModel.listByAudience(crew.id)).map((r) => r.ownerId)).toEqual([rahul]);
    expect(w.readModel.counts.get(crew.id)).toBe(1);
    // The group carries on without her; the 1:1 share is gone for both of them.
    expect(await w.audiences.isMember(crew.id, priya)).toBe(false);
    expect((await w.audiences.get(crew.id))!.memberCount).toBe(1);
    expect(await w.audiences.get(direct.id)).toBeUndefined();
    expect(await w.audiences.listForUser(rahul)).toHaveLength(1);
    // Her own data, her phone record, her identity.
    expect(await w.cards.listByOwner(priya)).toEqual([]);
    expect(await w.contacts.get(priya)).toBeUndefined();
    expect(await w.users.get(priya)).toBeUndefined();
    expect(w.purger.purged).toEqual([priya]);
    expect(w.identity.deleted).toEqual([priya]);
    // Nobody else was touched.
    expect(await w.users.get(rahul)).toBeDefined();
    expect(await w.contacts.get(rahul)).toBeDefined();
    expect(await w.cards.listByOwner(rahul)).toHaveLength(1);
  });

  it('removes a group it would leave empty', async () => {
    const w = await world();
    const solo = await w.createAudience.execute({ actor: rahul, name: 'Just me' });
    const res = await w.del.execute({ actor: rahul });
    expect(res.audiencesDeleted).toBe(1);
    expect(await w.audiences.get(solo.id)).toBeUndefined();
  });

  it('is safe to run again after a partial failure', async () => {
    const w = await world();
    const crew = await w.createAudience.execute({ actor: rahul, name: 'Crew' });
    await w.join.execute({
      actor: priya,
      code: (await w.createInvite.execute({ actor: rahul, audienceId: crew.id })).code,
    });
    await w.hold(priya, 'p1', crew.id);
    const failing = new DeleteAccount(
      w.users,
      w.cards,
      w.audiences,
      w.readModel,
      w.contacts,
      w.purger,
      {
        deleteIdentity: async () => {
          throw new Error('auth is down');
        },
      },
    );
    await expect(failing.execute({ actor: priya })).rejects.toThrow('auth is down');
    // Everything visible to others is already gone even though the last step failed…
    expect(await w.readModel.listByAudience(crew.id)).toEqual([]);
    // …and a second run finishes the job without complaint.
    await expect(w.del.execute({ actor: priya })).resolves.toMatchObject({ cardsRemoved: 0 });
    expect(w.identity.deleted).toEqual([priya]);
    expect(w.readModel.counts.get(crew.id)).toBe(0);
    expect((await w.audiences.get(crew.id))!.memberCount).toBe(1);
  });

  it('works for someone with nothing: no cards, no groups', async () => {
    const w = await world();
    await w.users.upsert(
      createUser({
        id: UserId('new'),
        name: 'New',
        phoneHash: 'h'.repeat(64),
        consentAt: new Date(),
        now: new Date(),
      }),
    );
    await expect(w.del.execute({ actor: UserId('new') })).resolves.toEqual({
      cardsRemoved: 0,
      audiencesLeft: 0,
      audiencesDeleted: 0,
    });
    expect(Audience.isDirectId('x')).toBe(false);
  });
});
