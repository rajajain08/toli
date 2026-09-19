import raw from '../cards.json' with { type: 'json' };
import type { CatalogCardJson, CatalogJson } from './types';

export type { CatalogCardJson, CatalogJson } from './types';

/**
 * cards.json is validated against the zod schema by this package's test on every PR, so the runtime
 * trusts it and the validator stays out of the web bundle. Import `@toli/catalog/schema` to validate.
 */
const data = raw as CatalogJson;

export const CATALOG_VERSION: number = data.version;
export const CATALOG_TAGS: readonly string[] = data.tags;
export const CATALOG: readonly CatalogCardJson[] = data.cards;

const byId = new Map(data.cards.map((c) => [c.id, c]));

export const getCatalogCard = (id: string): CatalogCardJson | undefined => byId.get(id);

export const CATALOG_BANKS: readonly string[] = [
  ...new Set(data.cards.map((c) => c.issuer)),
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
  return data.cards.filter((c) => {
    if (filter.issuer && c.issuer !== filter.issuer) return false;
    if (filter.tag && !c.tags.includes(filter.tag)) return false;
    if (terms.length === 0) return true;
    const hay = fold(`${c.name} ${c.issuer} ${c.bank} ${c.tags.join(' ')}`);
    return terms.every((t) => hay.includes(t));
  });
};
