import type { UserCardRepository } from '@toli/application';
import type { UserCard, UserCardId, UserId } from '@toli/domain';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { userCardFromDoc, userCardToDoc } from './converters';
import { paths } from './paths';

/** Write side: users/{uid}/cards/{ucId}. The owner is the only writer; rules enforce it. */
export class FirestoreUserCardRepository implements UserCardRepository {
  constructor(private readonly db: Firestore) {}

  async listByOwner(ownerId: UserId): Promise<UserCard[]> {
    const snap = await getDocs(collection(this.db, paths.userCards(ownerId)));
    return snap.docs.map((d) => userCardFromDoc(d, ownerId));
  }

  async get(ownerId: UserId, id: UserCardId): Promise<UserCard | undefined> {
    const snap = await getDoc(doc(this.db, paths.userCard(ownerId, id)));
    return snap.exists() ? userCardFromDoc(snap, ownerId) : undefined;
  }

  async save(card: UserCard): Promise<void> {
    await setDoc(doc(this.db, paths.userCard(card.ownerId, card.id)), userCardToDoc(card));
  }

  async remove(ownerId: UserId, id: UserCardId): Promise<void> {
    await deleteDoc(doc(this.db, paths.userCard(ownerId, id)));
  }
}
