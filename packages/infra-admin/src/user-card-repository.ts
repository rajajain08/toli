import type { UserCardRepository } from '@toli/application';
import { CardId, GroupId, UserCard, UserCardId, type UserId } from '@toli/domain';
import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { paths } from './paths';

const fromDoc = (id: string, ownerId: UserId, d: DocumentData): UserCard =>
  UserCard.rehydrate({
    id: UserCardId(id),
    ownerId,
    cardId: CardId(String(d['cardId'])),
    visibleTo: (Array.isArray(d['visibleTo']) ? d['visibleTo'] : [])
      .slice(0, 50)
      .map((x: unknown) => GroupId(String(x))),
    addedAt: d['addedAt'] instanceof Timestamp ? d['addedAt'].toDate() : new Date(0),
  });

/** Server side of the wallet. Only DeleteAccount uses it; day to day the owner writes their own cards. */
export class AdminUserCardRepository implements UserCardRepository {
  constructor(private readonly db: Firestore) {}

  async listByOwner(ownerId: UserId): Promise<UserCard[]> {
    const snap = await this.db.collection(paths.userCards(ownerId)).get();
    return snap.docs.map((d) => fromDoc(d.id, ownerId, d.data()));
  }

  async get(ownerId: UserId, id: UserCardId): Promise<UserCard | undefined> {
    const snap = await this.db.doc(paths.userCard(ownerId, id)).get();
    const d = snap.data();
    return snap.exists && d ? fromDoc(snap.id, ownerId, d) : undefined;
  }

  async save(card: UserCard): Promise<void> {
    await this.db.doc(paths.userCard(card.ownerId, card.id)).set({
      cardId: card.cardId,
      visibleTo: [...card.visibleTo],
      addedAt: Timestamp.fromDate(card.addedAt),
    });
  }

  async remove(ownerId: UserId, id: UserCardId): Promise<void> {
    await this.db.doc(paths.userCard(ownerId, id)).delete();
  }
}
