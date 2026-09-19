import { AddUserCard, RemoveUserCard } from '@toli/application';
import { CardId, GroupId, UserCard, UserCardId, UserId } from '@toli/domain';
import { BrowserIdGenerator, FirestoreUserCardRepository } from '@toli/infra-client';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEnv } from './setup';

/** The real client adapter, through the real rules, on the emulator. */
let env: RulesTestEnvironment;
const ALICE = UserId('alice');
const BOB = UserId('bob');
const repoFor = (uid: string) =>
  new FirestoreUserCardRepository(
    env.authenticatedContext(uid).firestore() as unknown as Firestore,
  );

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

describe('FirestoreUserCardRepository', () => {
  it('round-trips a card, including visibility', async () => {
    const repo = repoFor(ALICE);
    const card = UserCard.create({
      id: UserCardId('uc1'),
      ownerId: ALICE,
      cardId: CardId('hdfc-millennia'),
      now: new Date('2026-09-19T10:00:00Z'),
    }).show(GroupId('g1'));
    await repo.save(card);

    const loaded = await repo.get(ALICE, UserCardId('uc1'));
    expect(loaded?.cardId).toBe('hdfc-millennia');
    expect([...loaded!.visibleTo]).toEqual(['g1']);
    expect(loaded?.addedAt.toISOString()).toBe('2026-09-19T10:00:00.000Z');
    expect(await repo.listByOwner(ALICE)).toHaveLength(1);

    await repo.remove(ALICE, UserCardId('uc1'));
    expect(await repo.get(ALICE, UserCardId('uc1'))).toBeUndefined();
  });

  it('what the adapter writes is exactly what the rules allow', async () => {
    const repo = repoFor(ALICE);
    const clock = { now: () => new Date() };
    const catalog = { has: () => true };
    const add = new AddUserCard(repo, catalog, new BrowserIdGenerator(), clock);
    const a = await add.execute({ actor: ALICE, cardId: CardId('axis-atlas') });
    const again = await add.execute({ actor: ALICE, cardId: CardId('axis-atlas') });
    expect(again.id).toBe(a.id);
    await new RemoveUserCard(repo).execute({ actor: ALICE, cardId: a.id });
    expect(await repo.listByOwner(ALICE)).toHaveLength(0);
  });

  it('cannot read or write another person’s wallet', async () => {
    await repoFor(ALICE).save(
      UserCard.create({
        id: UserCardId('uc1'),
        ownerId: ALICE,
        cardId: CardId('axis-atlas'),
        now: new Date(),
      }),
    );
    const asBob = repoFor(BOB);
    await assertFails(asBob.listByOwner(ALICE));
    await assertFails(
      asBob.save(
        UserCard.create({
          id: UserCardId('x'),
          ownerId: ALICE,
          cardId: CardId('axis-atlas'),
          now: new Date(),
        }),
      ),
    );
  });
});

describe('BrowserIdGenerator', () => {
  it('makes 20-character ids and in-range indices', () => {
    const ids = new BrowserIdGenerator();
    expect(ids.newId()).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(ids.newId()).not.toBe(ids.newId());
    expect(ids.randomIndices(8, 32).every((i) => i >= 0 && i < 32)).toBe(true);
  });
});
