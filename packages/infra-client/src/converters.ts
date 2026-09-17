import { CardId, GroupId, UserCard, UserCardId, UserId, type User } from '@toli/domain';
import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';

export const toDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(0);

export const userCardFromDoc = (
  doc: QueryDocumentSnapshot<DocumentData>,
  ownerId: UserId,
): UserCard => {
  const d = doc.data();
  return UserCard.rehydrate({
    id: UserCardId(doc.id),
    ownerId,
    cardId: CardId(String(d['cardId'])),
    visibleTo: (Array.isArray(d['visibleTo']) ? d['visibleTo'] : []).map((x: unknown) =>
      GroupId(String(x)),
    ),
    addedAt: toDate(d['addedAt']),
  });
};

export const userCardToDoc = (card: UserCard): DocumentData => ({
  cardId: card.cardId,
  visibleTo: [...card.visibleTo],
  addedAt: Timestamp.fromDate(card.addedAt),
});

export const userFromDoc = (id: string, d: DocumentData): User => ({
  id: UserId(id),
  name: String(d['name'] ?? ''),
  phoneHash: String(d['phoneHash'] ?? ''),
  consentAt: toDate(d['consentAt']),
  createdAt: toDate(d['createdAt']),
});
