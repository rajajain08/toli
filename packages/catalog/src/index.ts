import raw from '../cards.json' with { type: 'json' };
import { catalogSchema, type CatalogCardJson } from './schema';

export { catalogSchema, catalogCardSchema, FORBIDDEN_FIELD_PATTERN } from './schema';
export type { CatalogCardJson, CatalogJson } from './schema';

const parsed = catalogSchema.parse(raw);

export const CATALOG_VERSION: number = parsed.version;
export const CATALOG_TAGS: readonly string[] = parsed.tags;
export const CATALOG: readonly CatalogCardJson[] = parsed.cards;

const byId = new Map(parsed.cards.map((c) => [c.id, c]));

export const getCatalogCard = (id: string): CatalogCardJson | undefined => byId.get(id);

export const CATALOG_BANKS: readonly string[] = [
  ...new Set(parsed.cards.map((c) => c.issuer)),
].sort();

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, '');

/** In-memory search over name, issuer, bank and tags. Runs offline; no Firestore read. */
export const searchCatalog = (
  query: string,
  filter: { issuer?: string | undefined; tag?: string | undefined } = {},
): CatalogCardJson[] => {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  return parsed.cards.filter((c) => {
    if (filter.issuer && c.issuer !== filter.issuer) return false;
    if (filter.tag && !c.tags.includes(filter.tag)) return false;
    if (terms.length === 0) return true;
    const hay = fold(`${c.name} ${c.issuer} ${c.bank} ${c.tags.join(' ')}`);
    return terms.every((t) => hay.includes(t));
  });
};
