import type { GroupCardReadModel, GroupCardRow } from '@toli/application';
import { CardId, UserCardId, UserId, type GroupId } from '@toli/domain';
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { paths } from './paths';

const rowFromDoc = (audienceId: GroupId, id: string, d: DocumentData): GroupCardRow => ({
  audienceId,
  userCardId: UserCardId(id),
  ownerId: UserId(String(d['ownerId'])),
  ownerName: String(d['ownerName'] ?? ''),
  cardId: CardId(String(d['cardId'])),
  name: String(d['name'] ?? ''),
  issuer: String(d['issuer'] ?? ''),
  color: String(d['color'] ?? '#3D3D3A'),
  tags: Array.isArray(d['tags']) ? d['tags'].map(String) : [],
  addedAt: d['addedAt'] instanceof Timestamp ? d['addedAt'].toDate() : new Date(0),
});

/**
 * audiences/{aid}/cards/{ucId}, the read side. Each row is written in its own small transaction that
 * also owns the audience's cardCount, so redelivered trigger events never count a row twice.
 */
export class AdminGroupCardReadModel implements GroupCardReadModel {
  constructor(private readonly db: Firestore) {}

  async listByAudience(audienceId: GroupId): Promise<GroupCardRow[]> {
    const snap = await this.db.collection(paths.audienceCards(audienceId)).get();
    return snap.docs.map((d) => rowFromDoc(audienceId, d.id, d.data()));
  }

  async findHolders(audienceIds: readonly GroupId[], cardId: CardId): Promise<GroupCardRow[]> {
    const perAudience = await Promise.all(
      audienceIds.map(async (aid) => {
        const snap = await this.db
          .collection(paths.audienceCards(aid))
          .where('cardId', '==', cardId)
          .get();
        return snap.docs.map((d) => rowFromDoc(aid, d.id, d.data()));
      }),
    );
    return perAudience.flat();
  }

  async project(rows: readonly GroupCardRow[]): Promise<void> {
    await Promise.all(
      rows.map((row) =>
        this.db.runTransaction(async (tx) => {
          const ref = this.db.doc(paths.audienceCard(row.audienceId, row.userCardId));
          const existing = await tx.get(ref);
          tx.set(
            ref,
            {
              ownerId: row.ownerId,
              ownerName: row.ownerName,
              cardId: row.cardId,
              name: row.name,
              issuer: row.issuer,
              color: row.color,
              tags: [...row.tags],
              addedAt: Timestamp.fromDate(row.addedAt),
            },
            { merge: true },
          );
          if (!existing.exists)
            tx.update(this.db.doc(paths.audience(row.audienceId)), {
              cardCount: FieldValue.increment(1),
            });
        }),
      ),
    );
  }

  async unproject(refs: readonly { audienceId: GroupId; userCardId: UserCardId }[]): Promise<void> {
    await Promise.all(
      refs.map((r) =>
        this.db.runTransaction(async (tx) => {
          const ref = this.db.doc(paths.audienceCard(r.audienceId, r.userCardId));
          const audienceRef = this.db.doc(paths.audience(r.audienceId));
          // Firestore transactions need every read before the first write.
          const [existing, audience] = await Promise.all([tx.get(ref), tx.get(audienceRef)]);
          if (!existing.exists) return;
          tx.delete(ref);
          if (audience.exists) tx.update(audienceRef, { cardCount: FieldValue.increment(-1) });
        }),
      ),
    );
  }
}
