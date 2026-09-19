import type { AudienceRepository } from '@toli/application';
import { Audience, GroupId, type UserId } from '@toli/domain';
import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore';
import { toDate } from './converters';
import { paths } from './paths';

const readOnly = (): never => {
  throw new Error('the client never writes shared state; call the function instead');
};

/**
 * Client side of AudienceRepository: reads only. Membership is answered from the user's own
 * users/{uid}/memberships list, which functions maintain, so it works offline and costs one cached read.
 */
export class FirestoreAudienceReader implements AudienceRepository {
  constructor(private readonly db: Firestore) {}

  async get(id: GroupId): Promise<Audience | undefined> {
    const snap = await getDoc(doc(this.db, paths.audience(id)));
    const d = snap.data();
    if (!snap.exists() || !d) return undefined;
    return Audience.rehydrate({
      id,
      type: d['type'] === 'direct' ? 'direct' : 'group',
      name: typeof d['name'] === 'string' ? d['name'] : undefined,
      createdBy: d['createdBy'] as UserId,
      memberCount: Number(d['memberCount'] ?? 0),
      cardCount: Number(d['cardCount'] ?? 0),
      createdAt: toDate(d['createdAt']),
    });
  }

  async isMember(audienceId: GroupId, userId: UserId): Promise<boolean> {
    return (await getDoc(doc(this.db, paths.membership(userId, audienceId)))).exists();
  }

  async listForUser(userId: UserId): Promise<Audience[]> {
    const memberships = await getDocs(collection(this.db, paths.memberships(userId)));
    const audiences = await Promise.all(memberships.docs.map((m) => this.get(GroupId(m.id))));
    return audiences.filter((a): a is Audience => a !== undefined);
  }

  create = readOnly;
  createDirect = readOnly;
  addMember = readOnly;
  removeMember = readOnly;
}
