import type { UserRepository } from '@toli/application';
import { UserId, type User } from '@toli/domain';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { paths } from './paths';

const toDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(0);

export class AdminUserRepository implements UserRepository {
  constructor(private readonly db: Firestore) {}

  async get(id: UserId): Promise<User | undefined> {
    const snap = await this.db.doc(paths.user(id)).get();
    const d = snap.data();
    if (!snap.exists || !d) return undefined;
    return {
      id: UserId(snap.id),
      name: String(d['name'] ?? ''),
      phoneHash: String(d['phoneHash'] ?? ''),
      consentAt: toDate(d['consentAt']),
      // Written from ADR-0013 onwards; a profile without it agreed to the first consent text.
      consentVersion: typeof d['consentVersion'] === 'number' ? d['consentVersion'] : 1,
      createdAt: toDate(d['createdAt']),
    };
  }

  /** The profile and everything nested under it (cards, memberships). Only DeleteAccount calls this. */
  async remove(id: UserId): Promise<void> {
    await this.db.recursiveDelete(this.db.doc(paths.user(id)));
  }

  async upsert(user: User): Promise<void> {
    await this.db.doc(paths.user(user.id)).set(
      {
        name: user.name,
        phoneHash: user.phoneHash,
        consentAt: Timestamp.fromDate(user.consentAt),
        consentVersion: user.consentVersion,
        createdAt: Timestamp.fromDate(user.createdAt),
      },
      { merge: true },
    );
  }
}
