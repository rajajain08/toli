import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codeOf, db, dispose, eventually, person, type TestUser } from './helpers';

type Created = { audienceId: string; name: string; inviteCode: string };
type Shared = { audienceId: string; created: boolean };

let rahul: TestUser, priya: TestUser, stranger: TestUser;
let directId: string;

beforeAll(async () => {
  [rahul, priya, stranger] = await Promise.all([
    person('Rahul'),
    person('Priya'),
    person('Stranger'),
  ]);
  const group = await rahul.call<{ name: string }, Created>('createAudience', { name: 'Crew' });
  await priya.call('joinByInvite', { code: group.inviteCode });
  directId = `direct_${[rahul.uid, priya.uid].sort().join('_')}`;
});
afterAll(async () => dispose(rahul, priya, stranger));

describe('shareWith', () => {
  it('opens a two-member direct audience; each side’s list names the other person', async () => {
    const res = await priya.call<{ userId: string }, Shared>('shareWith', { userId: rahul.uid });
    expect(res).toEqual({ audienceId: directId, created: true });

    const a = (await db.doc(`audiences/${directId}`).get()).data()!;
    expect(a).toMatchObject({ type: 'direct', createdBy: priya.uid, memberCount: 2, cardCount: 0 });
    expect(a['name']).toBeUndefined();
    expect((await db.doc(`audiences/${directId}/members/${priya.uid}`).get()).data()).toMatchObject(
      { role: 'owner', name: 'Priya' },
    );
    expect((await db.doc(`audiences/${directId}/members/${rahul.uid}`).get()).data()).toMatchObject(
      { role: 'member', name: 'Rahul' },
    );
    expect((await db.doc(`users/${priya.uid}/memberships/${directId}`).get()).data()).toMatchObject(
      { type: 'direct', name: 'Rahul' },
    );
    expect((await db.doc(`users/${rahul.uid}/memberships/${directId}`).get()).data()).toMatchObject(
      { type: 'direct', name: 'Priya' },
    );
  });

  it('can never exist twice, whoever asks', async () => {
    expect(
      await rahul.call<{ userId: string }, Shared>('shareWith', { userId: priya.uid }),
    ).toEqual({ audienceId: directId, created: false });
    expect((await db.doc(`audiences/${directId}`).get()).data()!['memberCount']).toBe(2);
  });

  it('refuses a stranger in either direction, yourself, and nobody', async () => {
    expect(await codeOf(rahul.call('shareWith', { userId: stranger.uid }))).toBe(
      'functions/permission-denied',
    );
    expect(await codeOf(stranger.call('shareWith', { userId: rahul.uid }))).toBe(
      'functions/permission-denied',
    );
    expect(await codeOf(rahul.call('shareWith', { userId: rahul.uid }))).toBe(
      'functions/invalid-argument',
    );
    expect(await codeOf(rahul.call('shareWith', {}))).toBe('functions/not-found');
  });

  it('a 1:1 share is never joinable by link', async () => {
    expect(await codeOf(priya.call('createInvite', { audienceId: directId }))).toBe(
      'functions/not-found',
    );
  });

  it('a card switched on for the person is projected into the 1:1 share, and nowhere else', async () => {
    await db
      .doc(`users/${priya.uid}/cards/uc-direct`)
      .set({ cardId: 'sbi-cashback', visibleTo: [directId], addedAt: Timestamp.now() });
    const row = await eventually(
      () => db.doc(`audiences/${directId}/cards/uc-direct`).get(),
      (s) => s.exists,
    );
    expect(row.data()).toMatchObject({
      ownerId: priya.uid,
      ownerName: 'Priya',
      cardId: 'sbi-cashback',
    });
    expect(
      await eventually(
        async () => (await db.doc(`audiences/${directId}`).get()).data()!['cardCount'] as number,
        (n) => n === 1,
      ),
    ).toBe(1);
  });
});
