import { InvalidArgument, type CardId, type CatalogCard } from '@toli/domain';
import type { CatalogMirror } from '../ports/index';

export interface CatalogSyncResult {
  created: CardId[];
  updated: CardId[];
  unchanged: number;
  /** In the mirror but no longer in the JSON. Reported, never deleted: user cards may still point at them. */
  orphaned: CardId[];
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const sameCard = (a: CatalogCard, b: CatalogCard) =>
  a.name === b.name &&
  a.issuer === b.issuer &&
  a.bank === b.bank &&
  a.color === b.color &&
  sameList(a.tags, b.tags) &&
  sameList(a.perks, b.perks);

/**
 * Brings catalog/{cardId} in line with packages/catalog/cards.json. Run by the sync script after a
 * catalogue change merges. Writes only what differs, so re-running it is free, and never deletes.
 */
export class SyncCatalogMirror {
  constructor(private readonly mirror: CatalogMirror) {}

  async execute(cmd: {
    cards: readonly CatalogCard[];
    dryRun?: boolean;
  }): Promise<CatalogSyncResult> {
    const wanted = new Map<CardId, CatalogCard>();
    for (const card of cmd.cards) {
      if (wanted.has(card.id)) throw new InvalidArgument(`duplicate catalogue id ${card.id}`);
      wanted.set(card.id, card);
    }

    const existing = new Map((await this.mirror.list()).map((c) => [c.id, c]));
    const result: CatalogSyncResult = { created: [], updated: [], unchanged: 0, orphaned: [] };
    const toWrite: CatalogCard[] = [];
    for (const card of wanted.values()) {
      const current = existing.get(card.id);
      if (current && sameCard(current, card)) {
        result.unchanged += 1;
        continue;
      }
      (current ? result.updated : result.created).push(card.id);
      toWrite.push(card);
    }
    for (const id of existing.keys()) if (!wanted.has(id)) result.orphaned.push(id);

    if (!cmd.dryRun && toWrite.length > 0) await this.mirror.upsert(toWrite);
    return result;
  }
}
