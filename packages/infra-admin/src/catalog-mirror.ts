import type { CatalogMirror } from '@toli/application';
import { CardId, type CatalogCard } from '@toli/domain';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { paths } from './paths';

/** Firestore caps a batch at 500 writes. */
const BATCH_SIZE = 400;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

const cardFromDoc = (id: string, d: DocumentData): CatalogCard => ({
  id: CardId(id),
  name: String(d['name'] ?? ''),
  issuer: String(d['issuer'] ?? ''),
  bank: String(d['bank'] ?? ''),
  tags: strings(d['tags']),
  perks: strings(d['perks']),
  color: String(d['color'] ?? ''),
});

/**
 * catalog/{cardId}, the mirror of packages/catalog/cards.json. Rules deny every client write, so the
 * Admin SDK is the only way in. `set` without merge: the JSON owns the whole document.
 */
export class AdminCatalogMirror implements CatalogMirror {
  constructor(private readonly db: Firestore) {}

  async list(): Promise<CatalogCard[]> {
    const snap = await this.db.collection(paths.catalog).get();
    return snap.docs.map((d) => cardFromDoc(d.id, d.data()));
  }

  async upsert(cards: readonly CatalogCard[]): Promise<void> {
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = this.db.batch();
      for (const c of cards.slice(i, i + BATCH_SIZE))
        batch.set(this.db.collection(paths.catalog).doc(c.id), {
          name: c.name,
          issuer: c.issuer,
          bank: c.bank,
          tags: [...c.tags],
          perks: [...c.perks],
          color: c.color,
        });
      await batch.commit();
    }
  }
}
