import { ExportMarketingList } from '@toli/application';
import {
  AdminContactRepository,
  AdminUserCardRepository,
  AdminUserRepository,
} from '@toli/infra-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from './helpers';

/** The export's real adapters against the emulator: the query, the joins, and who is left out. */
const tag = `mx-${Date.now()}`;
const uid = (n: string) => `${tag}-${n}`;
const now = Timestamp.now();
const catalog = {
  get: (id: string) =>
    id === 'axis-atlas' ? { name: 'Atlas', issuer: 'Axis', color: '#000000', tags: [] } : undefined,
};

beforeAll(async () => {
  const profile = (name: string, consentVersion?: number) => ({
    name,
    phoneHash: 'h'.repeat(64),
    consentAt: now,
    createdAt: now,
    ...(consentVersion ? { consentVersion } : {}),
  });
  await db.doc(`users/${uid('yes')}`).set(profile(`${tag} Yes`, 2));
  await db
    .doc(`contacts/${uid('yes')}`)
    .set({ phone: '+919800000001', marketingOptIn: true, marketingOptInAt: now, updatedAt: now });
  await db
    .doc(`users/${uid('yes')}/cards/c1`)
    .set({ cardId: 'axis-atlas', visibleTo: [], addedAt: now });

  await db.doc(`users/${uid('no')}`).set(profile(`${tag} No`, 2));
  await db
    .doc(`contacts/${uid('no')}`)
    .set({ phone: '+919800000002', marketingOptIn: false, updatedAt: now });

  await db.doc(`users/${uid('old')}`).set(profile(`${tag} Old`));
  await db
    .doc(`contacts/${uid('old')}`)
    .set({ phone: '+919800000003', marketingOptIn: true, marketingOptInAt: now, updatedAt: now });

  await db
    .doc(`contacts/${uid('orphan')}`)
    .set({ phone: '+919800000004', marketingOptIn: true, marketingOptInAt: now, updatedAt: now });
});
afterAll(async () => {
  for (const n of ['yes', 'no', 'old', 'orphan']) {
    await db.recursiveDelete(db.doc(`users/${uid(n)}`));
    await db.doc(`contacts/${uid(n)}`).delete();
  }
});

describe('ExportMarketingList on the emulator', () => {
  it('returns only people who said yes and are current, joined to their name and cards', async () => {
    const { rows, skipped } = await new ExportMarketingList(
      new AdminContactRepository(db),
      new AdminUserRepository(db),
      new AdminUserCardRepository(db),
      catalog,
    ).execute();
    const mine = rows.filter((r) => r.userId.startsWith(tag));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      name: `${tag} Yes`,
      phone: '+919800000001',
      cards: ['Axis Atlas'],
    });
    const phones = rows.map((r) => r.phone);
    for (const excluded of ['+919800000002', '+919800000003', '+919800000004'])
      expect(phones).not.toContain(excluded);
    expect(skipped.noProfile).toBeGreaterThanOrEqual(1);
    expect(skipped.consentOutdated).toBeGreaterThanOrEqual(1);
  });
});
