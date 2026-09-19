import type { IdentityGateway, PersonalDataPurger } from '@toli/application';
import type { UserId } from '@toli/domain';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminApp } from './admin';
import { adminPaths } from './paths';

export class FirebaseIdentityGateway implements IdentityGateway {
  async deleteIdentity(id: UserId): Promise<void> {
    try {
      await getAuth(getAdminApp()).deleteUser(id);
    } catch (err) {
      // Already gone: a second run of DeleteAccount must succeed.
      if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    }
  }
}

/** Per-person rows that are not domain entities. */
export class FirestorePersonalDataPurger implements PersonalDataPurger {
  constructor(private readonly db: Firestore) {}
  async purge(id: UserId): Promise<void> {
    await this.db.doc(adminPaths.ratelimit(id)).delete();
  }
}
