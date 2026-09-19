import type { UserCard, UserId } from '@toli/domain';
import {
  collection,
  orderBy,
  query,
  type DocumentData,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { userCardFromDoc } from './converters';
import { paths } from './paths';

export interface LiveQuery<T> {
  query: Query<DocumentData>;
  convert: (doc: QueryDocumentSnapshot<DocumentData>) => T;
}

/** The signed-in user's wallet, newest first. One listener, one screen. */
export const myCardsQuery = (db: Firestore, owner: UserId): LiveQuery<UserCard> => ({
  query: query(collection(db, paths.userCards(owner)), orderBy('addedAt', 'desc')),
  convert: (doc) => userCardFromDoc(doc, owner),
});
