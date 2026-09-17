import type {
  Audience,
  CardId,
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

export interface AudienceRepository {
  get(id: GroupId): Promise<Audience | undefined>;
  create(audience: Audience, owner: Membership): Promise<void>;
  addMember(membership: Membership, memberName: string): Promise<void>;
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

export interface GroupCardReadModel {
  listByAudience(audienceId: GroupId): Promise<GroupCardRow[]>;
  findHolders(audienceIds: readonly GroupId[], cardId: CardId): Promise<GroupCardRow[]>;
  project(rows: readonly GroupCardRow[]): Promise<void>;
  unproject(refs: readonly { audienceId: GroupId; userCardId: UserCardId }[]): Promise<void>;
}

/** HMAC-SHA256 of an E.164 phone with a server-side secret. Only the server holds the secret. */
export interface PhoneHasher {
  hash(phone: string): string;
}
