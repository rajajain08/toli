import { CardId, type CatalogCard } from '@toli/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryCatalogMirror } from '../testing/index';
import { SyncCatalogMirror } from './sync-catalog-mirror';

const card = (id: string, over: Partial<CatalogCard> = {}): CatalogCard => ({
  id: CardId(id),
  name: id,
  issuer: 'HDFC',
  bank: 'HDFC Bank',
  tags: ['rewards'],
  perks: ['Reward points'],
  color: '#112233',
  ...over,
});

describe('SyncCatalogMirror', () => {
  it('creates every card in an empty mirror', async () => {
    const mirror = new InMemoryCatalogMirror();
    const result = await new SyncCatalogMirror(mirror).execute({ cards: [card('a'), card('b')] });

    expect(result).toEqual({ created: ['a', 'b'], updated: [], unchanged: 0, orphaned: [] });
    expect([...mirror.docs.keys()]).toEqual(['a', 'b']);
  });

  it('is idempotent: a second run writes nothing', async () => {
    const mirror = new InMemoryCatalogMirror();
    const sync = new SyncCatalogMirror(mirror);
    await sync.execute({ cards: [card('a'), card('b')] });
    mirror.writes = 0;

    const result = await sync.execute({ cards: [card('a'), card('b')] });
    expect(result).toEqual({ created: [], updated: [], unchanged: 2, orphaned: [] });
    expect(mirror.writes).toBe(0);
  });

  it('rewrites only the cards whose content changed', async () => {
    const mirror = new InMemoryCatalogMirror();
    const sync = new SyncCatalogMirror(mirror);
    await sync.execute({ cards: [card('a'), card('b')] });
    mirror.writes = 0;

    const result = await sync.execute({
      cards: [card('a'), card('b', { perks: ['Reward points', 'Lounge access'] })],
    });
    expect(result).toEqual({ created: [], updated: ['b'], unchanged: 1, orphaned: [] });
    expect(mirror.writes).toBe(1);
    expect(mirror.docs.get(CardId('b'))?.perks).toEqual(['Reward points', 'Lounge access']);
  });

  it('never deletes: a card dropped from the JSON is reported as orphaned and left in place', async () => {
    const mirror = new InMemoryCatalogMirror();
    const sync = new SyncCatalogMirror(mirror);
    await sync.execute({ cards: [card('a'), card('gone')] });

    const result = await sync.execute({ cards: [card('a')] });
    expect(result.orphaned).toEqual(['gone']);
    expect(mirror.docs.has(CardId('gone'))).toBe(true);
  });

  it('a dry run reports the same diff and writes nothing', async () => {
    const mirror = new InMemoryCatalogMirror();
    const result = await new SyncCatalogMirror(mirror).execute({
      cards: [card('a')],
      dryRun: true,
    });
    expect(result.created).toEqual(['a']);
    expect(mirror.writes).toBe(0);
    expect(mirror.docs.size).toBe(0);
  });

  it('refuses a catalogue with duplicate ids rather than letting one silently win', async () => {
    const mirror = new InMemoryCatalogMirror();
    await expect(
      new SyncCatalogMirror(mirror).execute({ cards: [card('a'), card('a', { name: 'other' })] }),
    ).rejects.toThrow(/duplicate/i);
    expect(mirror.writes).toBe(0);
  });
});
