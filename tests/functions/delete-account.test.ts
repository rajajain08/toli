import { getAuth as adminAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, codeOf, db, dispose, eventually, person, type TestUser } from './helpers';

type Created = { audienceId: string; name: string; inviteCode: string };

let rahul: TestUser, priya: TestUser;
let group: Created;
let directId: string;
const exists = async (path: string) => (await db.doc(path).get()).exists;

beforeAll(async () => {
  [rahul, priya] = await Promise.all([person('Rahul'), person('Priya')]);
  group = await rahul.call<{ name: string }, Created>('createAudience', { name: 'Crew' });
  await priya.call('joinByInvite', { code: group.inviteCode });
  directId = (
    await priya.call<{ userId: string }, { audienceId: string }>('shareWith', { userId: rahul.uid })
  ).audienceId;
  await db
    .doc(`contacts/${priya.uid}`)
    .set({ phone: '+919876543211', marketingOptIn: true, updatedAt: Timestamp.now() });
  await db.doc(`ratelimits/${priya.uid}`).set({ joinAttempts: [Date.now()] });
  await db.doc(`users/${priya.uid}/cards/p1`).set({
    cardId: 'axis-atlas',
    visibleTo: [group.audienceId, directId],
    addedAt: Timestamp.now(),
  });
  await db
    .doc(`users/${priya.uid}/cards/p2`)
    .set({ cardId: 'hdfc-millennia', visibleTo: [], addedAt: Timestamp.now() });
  // Rahul shares one card into the 1:1 as well, so its removal has to clean his wallet too.
  await db.doc(`users/${rahul.uid}/cards/r1`).set({
    cardId: 'sbi-cashback',
    visibleTo: [group.audienceId, directId],
    addedAt: Timestamp.now(),
  });
  await eventually(
    () => db.doc(`audiences/${directId}/cards/r1`).get(),
    (s) => s.exists,
  );
  await eventually(
    () => db.doc(`audiences/${group.audienceId}/cards/p1`).get(),
    (s) => s.exists,
  );
});
afterAll(async () => dispose(rahul, priya));

describe('deleteAccount', () => {
  it('needs the typed confirmation', async () => {
    expect(await codeOf(priya.call('deleteAccount', {}))).toBe('functions/invalid-argument');
    expect(await codeOf(priya.call('deleteAccount', { confirm: 'delete' }))).toBe(
      'functions/invalid-argument',
    );
    expect(await exists(`users/${priya.uid}`)).toBe(true);
  });

  it('erases the person everywhere, and nobody else', async () => {
    const res = await priya.call<
      { confirm: string },
      { ok: boolean; cardsRemoved: number; audiencesLeft: number; audiencesDeleted: number }
    >('deleteAccount', { confirm: 'DELETE' });
    expect(res).toMatchObject({ ok: true, cardsRemoved: 2, audiencesLeft: 1, audiencesDeleted: 1 });

    // Her own data, including the phone record and the nested collections.
    for (const path of [
      `users/${priya.uid}`,
      `users/${priya.uid}/cards/p1`,
      `users/${priya.uid}/cards/p2`,
      `users/${priya.uid}/memberships/${group.audienceId}`,
      `contacts/${priya.uid}`,
      `ratelimits/${priya.uid}`,
    ])
      expect(await exists(path), path).toBe(false);
    await expect(adminAuth(admin).getUser(priya.uid)).rejects.toMatchObject({
      code: 'auth/user-not-found',
    });

    // The group carries on without her: member row and read-model row gone, counters followed.
    expect(await exists(`audiences/${group.audienceId}/members/${priya.uid}`)).toBe(false);
    expect(await exists(`audiences/${group.audienceId}/cards/p1`)).toBe(false);
    const g = (await db.doc(`audiences/${group.audienceId}`).get()).data()!;
    expect(g['memberCount']).toBe(1);
    expect(
      await eventually(
        async () =>
          (await db.doc(`audiences/${group.audienceId}`).get()).data()!['cardCount'] as number,
        (n) => n === 1,
      ),
    ).toBe(1);

    // The 1:1 share is gone for both of them, and Rahul's wallet no longer points at it.
    expect(await exists(`audiences/${directId}`)).toBe(false);
    expect(await exists(`audiences/${directId}/cards/r1`)).toBe(false);
    expect(await exists(`users/${rahul.uid}/memberships/${directId}`)).toBe(false);
    expect((await db.doc(`users/${rahul.uid}/cards/r1`).get()).data()!['visibleTo']).toEqual([
      group.audienceId,
    ]);

    // Rahul is otherwise untouched.
    expect(await exists(`users/${rahul.uid}`)).toBe(true);
    expect(await exists(`audiences/${group.audienceId}/members/${rahul.uid}`)).toBe(true);
    expect(await exists(`audiences/${group.audienceId}/cards/r1`)).toBe(true);
  });

  it('a group left empty is removed, with its invites', async () => {
    const solo = await person('Solo');
    try {
      const g = await solo.call<{ name: string }, Created>('createAudience', { name: 'Just me' });
      await solo.call('deleteAccount', { confirm: 'DELETE' });
      expect(await exists(`audiences/${g.audienceId}`)).toBe(false);
      expect(await exists(`invites/${g.inviteCode}`)).toBe(false);
    } finally {
      await dispose(solo);
    }
  });
});
