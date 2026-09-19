import type { ContactRepository } from '@toli/application';
import { UserId, type ContactRecord, type PhoneNumber } from '@toli/domain';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { adminPaths } from './paths';

const toDate = (v: unknown): Date | undefined => (v instanceof Timestamp ? v.toDate() : undefined);

/** contacts/{uid}: server-only. Rules deny every client read and write (ADR-0013). */
export class AdminContactRepository implements ContactRepository {
  constructor(private readonly db: Firestore) {}

  async get(userId: UserId): Promise<ContactRecord | undefined> {
    const snap = await this.db.doc(adminPaths.contact(userId)).get();
    const d = snap.data();
    if (!snap.exists || !d) return undefined;
    return {
      userId: UserId(snap.id),
      phone: String(d['phone']) as PhoneNumber,
      marketingOptIn: d['marketingOptIn'] === true,
      marketingOptInAt: toDate(d['marketingOptInAt']),
      updatedAt: toDate(d['updatedAt']) ?? new Date(0),
    };
  }

  async upsert(record: ContactRecord): Promise<void> {
    await this.db.doc(adminPaths.contact(record.userId)).set(
      {
        phone: record.phone,
        marketingOptIn: record.marketingOptIn,
        marketingOptInAt: record.marketingOptInAt
          ? Timestamp.fromDate(record.marketingOptInAt)
          : FieldValue.delete(),
        updatedAt: Timestamp.fromDate(record.updatedAt),
      },
      { merge: true },
    );
  }

  async listOptedIn(): Promise<ContactRecord[]> {
    const snap = await this.db.collection('contacts').where('marketingOptIn', '==', true).get();
    return snap.docs.flatMap((d) => {
      const x = d.data();
      return typeof x['phone'] === 'string'
        ? [
            {
              userId: UserId(d.id),
              phone: x['phone'] as PhoneNumber,
              marketingOptIn: true,
              marketingOptInAt: toDate(x['marketingOptInAt']),
              updatedAt: toDate(x['updatedAt']) ?? new Date(0),
            },
          ]
        : [];
    });
  }

  async remove(userId: UserId): Promise<void> {
    await this.db.doc(adminPaths.contact(userId)).delete();
  }
}
