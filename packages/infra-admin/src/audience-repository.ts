import type { AudienceRepository } from '@toli/application';
import {
  Audience,
  AudienceFull,
  GroupId,
  LIMITS,
  UserId,
  type AudienceType,
  type Membership,
} from '@toli/domain';
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { paths } from './paths';

const toDate = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date(0));

const audienceFromDoc = (id: string, d: DocumentData): Audience =>
  Audience.rehydrate({
    id: GroupId(id),
    type: (d['type'] === 'direct' ? 'direct' : 'group') as AudienceType,
    name: typeof d['name'] === 'string' ? d['name'] : undefined,
    createdBy: UserId(String(d['createdBy'])),
    memberCount: Number(d['memberCount'] ?? 0),
    cardCount: Number(d['cardCount'] ?? 0),
    createdAt: toDate(d['createdAt']),
  });

/**
 * Shared state: only functions write here. The audience document, its members subcollection and each
 * member's own membership list are kept in step inside one batch or transaction.
 */
export class AdminAudienceRepository implements AudienceRepository {
  constructor(private readonly db: Firestore) {}

  async get(id: GroupId): Promise<Audience | undefined> {
    const snap = await this.db.doc(paths.audience(id)).get();
    const d = snap.data();
    return snap.exists && d ? audienceFromDoc(snap.id, d) : undefined;
  }

  async create(audience: Audience, owner: Membership, ownerName: string): Promise<void> {
    const batch = this.db.batch();
    batch.create(this.db.doc(paths.audience(audience.id)), {
      type: audience.type,
      ...(audience.name === undefined ? {} : { name: audience.name }),
      createdBy: audience.createdBy,
      memberCount: 1,
      cardCount: 0,
      createdAt: Timestamp.fromDate(audience.createdAt),
    });
    batch.set(this.db.doc(paths.audienceMember(audience.id, owner.userId)), {
      joinedAt: Timestamp.fromDate(owner.joinedAt),
      role: owner.role,
      name: ownerName,
    });
    batch.set(this.db.doc(paths.membership(owner.userId, audience.id)), {
      type: audience.type,
      ...(audience.name === undefined ? {} : { name: audience.name }),
      joinedAt: Timestamp.fromDate(owner.joinedAt),
    });
    await batch.commit();
  }

  async addMember(membership: Membership, memberName: string): Promise<void> {
    const audienceRef = this.db.doc(paths.audience(membership.audienceId));
    const memberRef = this.db.doc(paths.audienceMember(membership.audienceId, membership.userId));
    await this.db.runTransaction(async (tx) => {
      const [audienceSnap, memberSnap] = await Promise.all([
        tx.get(audienceRef),
        tx.get(memberRef),
      ]);
      const d = audienceSnap.data();
      if (!audienceSnap.exists || !d) throw new Error(`audience ${membership.audienceId} missing`);
      if (memberSnap.exists) return;
      const cap = d['type'] === 'direct' ? 2 : LIMITS.membersPerAudience;
      if (Number(d['memberCount'] ?? 0) >= cap) throw new AudienceFull(cap);
      tx.set(memberRef, {
        joinedAt: Timestamp.fromDate(membership.joinedAt),
        role: membership.role,
        name: memberName,
      });
      tx.set(this.db.doc(paths.membership(membership.userId, membership.audienceId)), {
        type: d['type'],
        ...(typeof d['name'] === 'string' ? { name: d['name'] } : {}),
        joinedAt: Timestamp.fromDate(membership.joinedAt),
      });
      tx.update(audienceRef, { memberCount: FieldValue.increment(1) });
    });
  }

  async removeMember(audienceId: GroupId, userId: UserId): Promise<void> {
    const audienceRef = this.db.doc(paths.audience(audienceId));
    const memberRef = this.db.doc(paths.audienceMember(audienceId, userId));
    await this.db.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) return;
      tx.delete(memberRef);
      tx.delete(this.db.doc(paths.membership(userId, audienceId)));
      tx.update(audienceRef, { memberCount: FieldValue.increment(-1) });
    });
  }

  async isMember(audienceId: GroupId, userId: UserId): Promise<boolean> {
    return (await this.db.doc(paths.audienceMember(audienceId, userId)).get()).exists;
  }

  async listForUser(userId: UserId): Promise<Audience[]> {
    const memberships = await this.db.collection(paths.memberships(userId)).get();
    if (memberships.empty) return [];
    const snaps = await this.db.getAll(
      ...memberships.docs.map((m) => this.db.doc(paths.audience(m.id))),
    );
    return snaps.flatMap((s) => {
      const d = s.data();
      return s.exists && d ? [audienceFromDoc(s.id, d)] : [];
    });
  }
}
