import { describe, expect, it } from 'vitest';
import raw from '../cards.json' with { type: 'json' };
import sources from '../sources.json' with { type: 'json' };
import { CATALOG, CATALOG_BANKS, getCatalogCard, searchCatalog } from './index';
import { FORBIDDEN_FIELD_PATTERN, catalogSchema } from './schema';

describe('catalog', () => {
  it('validates against the schema', () => {
    expect(() => catalogSchema.parse(raw)).not.toThrow();
    expect(CATALOG.length).toBeGreaterThanOrEqual(40);
  });

  it('rejects duplicate ids and unknown tags', () => {
    const dup = { ...raw, cards: [raw.cards[0], raw.cards[0]] };
    expect(catalogSchema.safeParse(dup).success).toBe(false);
    const badTag = { ...raw, cards: [{ ...raw.cards[0], tags: ['nope'] }] };
    expect(catalogSchema.safeParse(badTag).success).toBe(false);
  });

  it('has no field for a card number, expiry, CVV, limit or spend', () => {
    const keys = new Set<string>();
    for (const card of raw.cards) for (const k of Object.keys(card)) keys.add(k);
    for (const k of keys) expect(k).not.toMatch(FORBIDDEN_FIELD_PATTERN);
    const extra = { ...raw, cards: [{ ...raw.cards[0], number: '4111' }] };
    expect(catalogSchema.safeParse(extra).success).toBe(false);
  });

  it('the hand-written type matches the schema, so the two cannot drift', () => {
    const parsed = catalogSchema.parse(raw);
    expect(Object.keys(parsed.cards[0]!).sort()).toEqual([
      'bank',
      'color',
      'id',
      'issuer',
      'name',
      'perks',
      'tags',
    ]);
    expect(CATALOG).toEqual(parsed.cards);
  });

  it('keeps one issuer label per bank, so the bank chips never split a bank in two', () => {
    const labels = new Map<string, string>();
    for (const c of raw.cards) {
      expect(labels.get(c.bank) ?? c.issuer).toBe(c.issuer);
      labels.set(c.bank, c.issuer);
    }
  });

  it('sources.json is a sidecar: every entry points at a catalogue card and an https page', () => {
    const ids = new Set(raw.cards.map((c) => c.id));
    for (const [id, source] of Object.entries(sources)) {
      expect(ids.has(id), id).toBe(true);
      expect(source.url, id).toMatch(/^https:\/\//);
      expect(source.verifiedAt, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('looks up by id', () => {
    expect(getCatalogCard('hdfc-millennia')?.name).toBe('Millennia');
    expect(getCatalogCard('nope')).toBeUndefined();
  });

  it('searches by name, issuer and tag, case-insensitively', () => {
    expect(searchCatalog('millennia').map((c) => c.id)).toEqual([
      'hdfc-millennia',
      'idfc-first-millennia',
    ]);
    expect(searchCatalog('hdfc millennia').map((c) => c.id)).toEqual(['hdfc-millennia']);
    expect(searchCatalog('AMAZON').map((c) => c.id)).toContain('icici-amazon-pay');
    expect(searchCatalog('', { issuer: 'Amex' }).every((c) => c.issuer === 'Amex')).toBe(true);
    expect(searchCatalog('', { tag: 'fuel' }).map((c) => c.id)).toContain('sbi-bpcl-octane');
    expect(searchCatalog('zzz')).toEqual([]);
  });

  it('exposes a sorted list of issuers for the bank chips', () => {
    expect(CATALOG_BANKS).toEqual([...CATALOG_BANKS].sort());
    expect(CATALOG_BANKS).toContain('HDFC');
  });
});
