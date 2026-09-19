import type { GroupCardRow } from '@toli/application';
import {
  CardId,
  GroupId,
  UserCardId,
  UserId,
  type AudienceType,
  type MemberRole,
  type UserCard,
} from '@toli/domain';
import {
  collection,
  doc,
  orderBy,
  query,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { toDate, userCardFromDoc } from './converters';
import { paths } from './paths';

export interface LiveQuery<T> {
  query: Query<DocumentData>;
  convert: (doc: QueryDocumentSnapshot<DocumentData>) => T;
}

export interface LiveDoc<T> {
  ref: DocumentReference<DocumentData>;
  convert: (snap: DocumentSnapshot<DocumentData>) => T | null;
}

/** The signed-in user's wallet, newest first. One listener, one screen. */
export const myCardsQuery = (db: Firestore, owner: UserId): LiveQuery<UserCard> => ({
  query: query(collection(db, paths.userCards(owner)), orderBy('addedAt', 'desc')),
  convert: (d) => userCardFromDoc(d, owner),
});

/** One row of users/{uid}/memberships: enough to draw the Groups list without reading each audience. */
export interface MembershipRow {
  audienceId: GroupId;
  type: AudienceType;
  name: string | undefined;
  joinedAt: Date;
}

export const myMembershipsQuery = (db: Firestore, uid: UserId): LiveQuery<MembershipRow> => ({
  query: query(collection(db, paths.memberships(uid)), orderBy('joinedAt', 'desc')),
  convert: (d) => ({
    audienceId: GroupId(d.id),
    type: d.data()['type'] === 'direct' ? 'direct' : 'group',
    name: typeof d.data()['name'] === 'string' ? d.data()['name'] : undefined,
    joinedAt: toDate(d.data()['joinedAt']),
  }),
});

export interface AudienceSummary {
  id: GroupId;
  type: AudienceType;
  name: string | undefined;
  createdBy: UserId;
  memberCount: number;
  cardCount: number;
}

export const audienceDoc = (db: Firestore, aid: GroupId): LiveDoc<AudienceSummary> => ({
  ref: doc(db, paths.audience(aid)),
  convert: (snap) => {
    const d = snap.data();
    if (!snap.exists() || !d) return null;
    return {
      id: GroupId(snap.id),
      type: d['type'] === 'direct' ? 'direct' : 'group',
      name: typeof d['name'] === 'string' ? d['name'] : undefined,
      createdBy: UserId(String(d['createdBy'])),
      memberCount: Number(d['memberCount'] ?? 0),
      cardCount: Number(d['cardCount'] ?? 0),
    };
  },
});

export interface MemberRow {
  userId: UserId;
  name: string;
  role: MemberRole;
  joinedAt: Date;
}

export const audienceMembersQuery = (db: Firestore, aid: GroupId): LiveQuery<MemberRow> => ({
  query: query(collection(db, paths.audienceMembers(aid)), orderBy('joinedAt', 'asc')),
  convert: (d) => ({
    userId: UserId(d.id),
    name: String(d.data()['name'] ?? ''),
    role: d.data()['role'] === 'owner' ? 'owner' : 'member',
    joinedAt: toDate(d.data()['joinedAt']),
  }),
});

/** The read side: one query draws the whole group screen. `collection` is the same rows, unordered, for Find. */
export const audienceCardsQuery = (
  db: Firestore,
  aid: GroupId,
): LiveQuery<GroupCardRow> & { collection: CollectionReference<DocumentData> } => ({
  collection: collection(db, paths.audienceCards(aid)),
  query: query(collection(db, paths.audienceCards(aid)), orderBy('addedAt', 'desc')),
  convert: (d) => {
    const x = d.data();
    return {
      audienceId: aid,
      userCardId: UserCardId(d.id),
      ownerId: UserId(String(x['ownerId'])),
      ownerName: String(x['ownerName'] ?? ''),
      cardId: CardId(String(x['cardId'])),
      name: String(x['name'] ?? ''),
      issuer: String(x['issuer'] ?? ''),
      color: String(x['color'] ?? '#3D3D3A'),
      tags: Array.isArray(x['tags']) ? x['tags'].map(String) : [],
      addedAt: toDate(x['addedAt']),
    };
  },
});
