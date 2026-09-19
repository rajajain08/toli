import type { UserRepository } from '@toli/application';
import type { User, UserId } from '@toli/domain';
import { doc, getDoc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { userFromDoc } from './converters';
import { paths } from './paths';

/** Reads the signed-in user's own profile. `upsert` may only touch fields rules allow the client to write (name). */
export class FirestoreUserRepository implements UserRepository {
  constructor(private readonly db: Firestore) {}

  async get(id: UserId): Promise<User | undefined> {
    const snap = await getDoc(doc(this.db, paths.user(id)));
    return snap.exists() ? userFromDoc(snap.id, snap.data()) : undefined;
  }

  /** Rules deny it: only the deleteAccount function removes a profile. */
  remove(): Promise<void> {
    return Promise.reject(new Error('a profile is only deleted by the deleteAccount function'));
  }

  async upsert(user: User): Promise<void> {
    await setDoc(
      doc(this.db, paths.user(user.id)),
      {
        name: user.name,
        consentAt: Timestamp.fromDate(user.consentAt),
        createdAt: Timestamp.fromDate(user.createdAt),
      },
      { merge: true },
    );
  }
}
