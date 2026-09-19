import { SyncCatalogMirror } from '@toli/application';
import { CardId, type CatalogCard } from '@toli/domain';
import { AdminCatalogMirror } from '@toli/infra-admin';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './helpers';

const card = (id: string, over: Partial<CatalogCard> = {}): CatalogCard => ({
  id: CardId(id),
  name: `Card ${id}`,
  issuer: 'HDFC',
  bank: 'HDFC Bank',
  tags: ['travel', 'lounge'],
  perks: ['Airport lounge access'],
  color: '#112233',
  ...over,
});

describe('AdminCatalogMirror', () => {
  beforeEach(async () => {
    await db.recursiveDelete(db.collection('catalog'));
  });

  it('round-trips cards through catalog/{cardId}', async () => {
    const mirror = new AdminCatalogMirror(db);
    await mirror.upsert([card('a'), card('b', { tags: ['fuel'] })]);

    const listed = (await mirror.list()).sort((x, y) => x.id.localeCompare(y.id));
    expect(listed).toEqual([card('a'), card('b', { tags: ['fuel'] })]);
    expect((await db.doc('catalog/a').get()).data()).toEqual({
      name: 'Card a',
      issuer: 'HDFC',
      bank: 'HDFC Bank',
      tags: ['travel', 'lounge'],
      perks: ['Airport lounge access'],
      color: '#112233',
    });
  });

  it('writes more cards than one Firestore batch holds', async () => {
    const many = Array.from({ length: 450 }, (_, i) => card(`bulk-${i}`));
    await new AdminCatalogMirror(db).upsert(many);
    expect((await db.collection('catalog').count().get()).data().count).toBe(450);
  });

  it('syncs idempotently and replaces a changed document whole', async () => {
    const sync = new SyncCatalogMirror(new AdminCatalogMirror(db));
    expect((await sync.execute({ cards: [card('a'), card('b')] })).created).toEqual(['a', 'b']);
    // A field the JSON does not own must not survive a rewrite of that card.
    await db.doc('catalog/b').set({ stray: true }, { merge: true });

    const again = await sync.execute({ cards: [card('a'), card('b', { name: 'Renamed' })] });
    expect(again).toEqual({ created: [], updated: ['b'], unchanged: 1, orphaned: [] });
    expect((await db.doc('catalog/b').get()).data()).toEqual({
      name: 'Renamed',
      issuer: 'HDFC',
      bank: 'HDFC Bank',
      tags: ['travel', 'lounge'],
      perks: ['Airport lounge access'],
      color: '#112233',
    });
  });
});
