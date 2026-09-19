import type {
  Audience,
  ContactRecord,
  CardId,
  CatalogCard,
  GroupId,
  Invite,
  InviteCode,
  Membership,
  User,
  UserCard,
  UserCardId,
  UserId,
} from '@toli/domain';

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  /** Opaque document id, e.g. a Firestore auto id. */
  newId(): string;
  /** `count` uniformly random integers in [0, bound). Used for invite codes. */
  randomIndices(count: number, bound: number): number[];
}

export interface RateLimiter {
  /** Records an attempt and returns whether it is within the window. */
  attempt(key: string, action: string): Promise<{ allowed: boolean; retryAfterMs: number }>;
}

export interface UserRepository {
  get(id: UserId): Promise<User | undefined>;
  upsert(user: User): Promise<void>;
}

export interface UserCardRepository {
  listByOwner(ownerId: UserId): Promise<UserCard[]>;
  get(ownerId: UserId, id: UserCardId): Promise<UserCard | undefined>;
  save(card: UserCard): Promise<void>;
  remove(ownerId: UserId, id: UserCardId): Promise<void>;
}

export interface DirectMember {
  membership: Membership;
  name: string;
  peerName: string;
}

export interface AudienceRepository {
  get(id: GroupId): Promise<Audience | undefined>;
  /** Creates the audience with its first member. `ownerName` is denormalised onto the member row. */
  create(audience: Audience, owner: Membership, ownerName: string): Promise<void>;
  /** Idempotent. Must enforce the member cap atomically and keep `memberCount` and the user's membership list in step. */
  addMember(membership: Membership, memberName: string): Promise<void>;
  /**
   * Creates a 1:1 audience with both people in it, atomically, and is a no-op if it already exists.
   * Each person's own membership entry is named after the other person, which is how their list shows it.
   */
  createDirect(audience: Audience, members: readonly [DirectMember, DirectMember]): Promise<void>;
  removeMember(audienceId: GroupId, userId: UserId): Promise<void>;
  isMember(audienceId: GroupId, userId: UserId): Promise<boolean>;
  listForUser(userId: UserId): Promise<Audience[]>;
}

export interface InviteRepository {
  get(code: InviteCode): Promise<Invite | undefined>;
  create(invite: Invite): Promise<void>;
  /** Persists the consumed invite. Implementations must be transactional with the membership write. */
  consume(invite: Invite): Promise<void>;
}

/** One row of the read side: audiences/{aid}/cards/{ucId}. Denormalised so a group screen is one query. */
export interface GroupCardRow {
  readonly audienceId: GroupId;
  readonly userCardId: UserCardId;
  readonly ownerId: UserId;
  readonly ownerName: string;
  readonly cardId: CardId;
  readonly name: string;
  readonly issuer: string;
  readonly color: string;
  readonly tags: readonly string[];
  readonly addedAt: Date;
}

/**
 * The read side. `project` and `unproject` are idempotent (triggers are at-least-once) and own the
 * audience's `cardCount`: a row that already exists is not counted twice, a row already gone is not
 * subtracted twice.
 */
export interface GroupCardReadModel {
  listByAudience(audienceId: GroupId): Promise<GroupCardRow[]>;
  findHolders(audienceIds: readonly GroupId[], cardId: CardId): Promise<GroupCardRow[]>;
  /** Rows carrying a catalogue tag such as "lounge" or "fuel". */
  findByTag(audienceIds: readonly GroupId[], tag: string): Promise<GroupCardRow[]>;
  project(rows: readonly GroupCardRow[]): Promise<void>;
  unproject(refs: readonly { audienceId: GroupId; userCardId: UserCardId }[]): Promise<void>;
}

/** HMAC-SHA256 of an E.164 phone with a server-side secret. Only the server holds the secret. */
export interface PhoneHasher {
  hash(phone: string): string;
}

/** Server-only store of verified phone numbers and marketing consent (ADR-0013). Never implemented on the client. */
export interface ContactRepository {
  get(userId: UserId): Promise<ContactRecord | undefined>;
  upsert(record: ContactRecord): Promise<void>;
  remove(userId: UserId): Promise<void>;
}

/** Catalogue lookup for the projection. Backed by packages/catalog on both sides; no network. */
export interface CardCatalogReader {
  get(
    cardId: CardId,
  ): { name: string; issuer: string; color: string; tags: readonly string[] } | undefined;
}

/**
 * catalog/{cardId}, the Firestore mirror of packages/catalog/cards.json. The JSON is the source of truth
 * (ADR-0006); the mirror exists for server-side validation and is written only by the sync script.
 * Deliberately has no delete: user cards reference catalogue ids, so an id is never taken away.
 */
export interface CatalogMirror {
  list(): Promise<CatalogCard[]>;
  upsert(cards: readonly CatalogCard[]): Promise<void>;
}
