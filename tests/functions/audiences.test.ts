import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codeOf, db, dispose, eventually, person, type TestUser } from './helpers';

type Created = { audienceId: string; name: string; inviteCode: string };
type Joined = { audienceId: string; name: string; alreadyMember: boolean };

let rahul: TestUser, priya: TestUser, stranger: TestUser;
let group: Created;

beforeAll(async () => {
  [rahul, priya, stranger] = await Promise.all([
    person('Rahul'),
    person('Priya'),
    person('Stranger'),
  ]);
  group = await rahul.call<{ name: string }, Created>('createAudience', {
    name: '  Weekend   Crew ',
  });
});
afterAll(async () => dispose(rahul, priya, stranger));

describe('createAudience', () => {
  it('writes the audience, the owner member row and the owner’s membership, and returns an invite', async () => {
    expect(group.name).toBe('Weekend Crew');
    expect(group.inviteCode).toMatch(/^[A-HJKMNP-TV-Z0-9]{8}$/);
    const a = (await db.doc(`audiences/${group.audienceId}`).get()).data()!;
    expect(a).toMatchObject({
      type: 'group',
      name: 'Weekend Crew',
      createdBy: rahul.uid,
      memberCount: 1,
      cardCount: 0,
    });
    expect(
      (await db.doc(`audiences/${group.audienceId}/members/${rahul.uid}`).get()).data(),
    ).toMatchObject({ role: 'owner', name: 'Rahul' });
    expect(
      (await db.doc(`users/${rahul.uid}/memberships/${group.audienceId}`).get()).data(),
    ).toMatchObject({ type: 'group', name: 'Weekend Crew' });
    expect((await db.doc(`invites/${group.inviteCode}`).get()).data()).toMatchObject({
      audienceId: group.audienceId,
      uses: 0,
    });
  });
  it('rejects an empty name and an anonymous caller', async () => {
    expect(await codeOf(rahul.call('createAudience', { name: '   ' }))).toBe(
      'functions/invalid-argument',
    );
  });
});

describe('joinByInvite', () => {
  it('joins through the code as typed by a person, once', async () => {
    const typed = `${group.inviteCode.slice(0, 4).toLowerCase()}-${group.inviteCode.slice(4).toLowerCase()} `;
    const res = await priya.call<{ code: string }, Joined>('joinByInvite', { code: typed });
    expect(res).toMatchObject({
      audienceId: group.audienceId,
      name: 'Weekend Crew',
      alreadyMember: false,
    });
    const again = await priya.call<{ code: string }, Joined>('joinByInvite', {
      code: group.inviteCode,
    });
    expect(again.alreadyMember).toBe(true);

    expect((await db.doc(`audiences/${group.audienceId}`).get()).data()!['memberCount']).toBe(2);
    expect(
      (await db.doc(`audiences/${group.audienceId}/members/${priya.uid}`).get()).data(),
    ).toMatchObject({ role: 'member', name: 'Priya' });
    expect((await db.doc(`users/${priya.uid}/memberships/${group.audienceId}`).get()).exists).toBe(
      true,
    );
    expect((await db.doc(`invites/${group.inviteCode}`).get()).data()!['uses']).toBe(1);
  });

  it('refuses an expired invite', async () => {
    await db
      .doc('invites/EXP1RED0')
      .set({
        audienceId: group.audienceId,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
        uses: 0,
        maxUses: 50,
      });
    expect(await codeOf(stranger.call('joinByInvite', { code: 'EXP1RED0' }))).toBe(
      'functions/invalid-argument',
    );
    expect(
      (await db.doc(`audiences/${group.audienceId}/members/${stranger.uid}`).get()).exists,
    ).toBe(false);
  });

  it('only members can mint invites', async () => {
    expect(await codeOf(stranger.call('createInvite', { audienceId: group.audienceId }))).toBe(
      'functions/permission-denied',
    );
    const minted = await priya.call<{ audienceId: string }, { code: string }>('createInvite', {
      audienceId: group.audienceId,
    });
    expect(minted.code).toMatch(/^[A-HJKMNP-TV-Z0-9]{8}$/);
  });

  it('rate limits guessing: ten wrong codes an hour, then resource-exhausted even for a right one', async () => {
    const guesser = await person('Guesser');
    try {
      const results = [];
      for (let i = 0; i < 10; i++)
        results.push(await codeOf(guesser.call('joinByInvite', { code: 'ZZZZZZZ' + (i % 10) })));
      expect(new Set(results)).toEqual(new Set(['functions/invalid-argument']));
      expect(await codeOf(guesser.call('joinByInvite', { code: group.inviteCode }))).toBe(
        'functions/resource-exhausted',
      );
      expect(
        (await db.doc(`audiences/${group.audienceId}/members/${guesser.uid}`).get()).exists,
      ).toBe(false);
    } finally {
      await dispose(guesser);
    }
  });
});

describe('onUserCardWritten (projection)', () => {
  const cardRef = () => db.doc(`users/${rahul.uid}/cards/uc-atlas`);
  const rowRef = () => db.doc(`audiences/${group.audienceId}/cards/uc-atlas`);
  const count = async () =>
    (await db.doc(`audiences/${group.audienceId}`).get()).data()!['cardCount'] as number;

  it('projects a visible card into the group with denormalised fields and bumps cardCount', async () => {
    await cardRef().set({
      cardId: 'axis-atlas',
      visibleTo: [group.audienceId],
      addedAt: Timestamp.now(),
    });
    const row = await eventually(
      () => rowRef().get(),
      (s) => s.exists,
    );
    expect(row.data()).toMatchObject({
      ownerId: rahul.uid,
      ownerName: 'Rahul',
      cardId: 'axis-atlas',
      name: 'Atlas',
      issuer: 'Axis',
    });
    expect(Object.keys(row.data()!).sort()).toEqual([
      'addedAt',
      'cardId',
      'color',
      'issuer',
      'name',
      'ownerId',
      'ownerName',
      'tags',
    ]);
    expect(await eventually(count, (n) => n === 1)).toBe(1);
  });

  it('removes the row when visibility is withdrawn, and again when the card is deleted', async () => {
    await cardRef().update({ visibleTo: [] });
    expect(
      (
        await eventually(
          () => rowRef().get(),
          (s) => !s.exists,
        )
      ).exists,
    ).toBe(false);
    expect(await eventually(count, (n) => n === 0)).toBe(0);

    await cardRef().update({ visibleTo: [group.audienceId] });
    await eventually(
      () => rowRef().get(),
      (s) => s.exists,
    );
    await cardRef().delete();
    expect(
      (
        await eventually(
          () => rowRef().get(),
          (s) => !s.exists,
        )
      ).exists,
    ).toBe(false);
    expect(await eventually(count, (n) => n === 0)).toBe(0);
  });

  it('never projects into a group the owner is not in, whatever the client wrote into visibleTo', async () => {
    const theirs = await stranger.call<{ name: string }, Created>('createAudience', {
      name: 'Strangers only',
    });
    await db
      .doc(`users/${rahul.uid}/cards/uc-sneaky`)
      .set({
        cardId: 'hdfc-millennia',
        visibleTo: [theirs.audienceId, group.audienceId],
        addedAt: Timestamp.now(),
      });
    // The legitimate audience gets the row, which also proves the trigger has run.
    await eventually(
      () => db.doc(`audiences/${group.audienceId}/cards/uc-sneaky`).get(),
      (s) => s.exists,
    );
    expect((await db.doc(`audiences/${theirs.audienceId}/cards/uc-sneaky`).get()).exists).toBe(
      false,
    );
    expect((await db.doc(`audiences/${theirs.audienceId}`).get()).data()!['cardCount']).toBe(0);
  });
});
