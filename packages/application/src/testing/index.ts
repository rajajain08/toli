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
import type {
  AudienceRepository,
  DirectMember,
  CatalogMirror,
  Clock,
  ContactRepository,
  GroupCardReadModel,
  GroupCardRow,
  IdGenerator,
  IdentityGateway,
  InviteRepository,
  PersonalDataPurger,
  PhoneHasher,
  RateLimiter,
  UserCardRepository,
  UserRepository,
} from '../ports/index';

export class FixedClock implements Clock {
  constructor(private current = new Date('2026-09-18T00:00:00Z')) {}
  now(): Date {
    return this.current;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
  set(date: Date): void {
    this.current = date;
  }
}

export class SequentialIds implements IdGenerator {
  private n = 0;
  constructor(private readonly prefix = 'id') {}
  newId(): string {
    this.n += 1;
    return `${this.prefix}${this.n}`;
  }
  private r = 0;
  /** Deterministic and distinct per call: the call number written in base `bound`, left-padded with zeros. */
  randomIndices(count: number, bound: number): number[] {
    let v = this.r++;
    const out = new Array<number>(count).fill(0);
    for (let i = count - 1; i >= 0 && v > 0; i--) {
      out[i] = v % bound;
      v = Math.floor(v / bound);
    }
    return out;
  }
}

export class InMemoryRateLimiter implements RateLimiter {
  readonly attempts = new Map<string, number>();
  constructor(private readonly max = 5) {}
  async attempt(key: string, action: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const k = `${key}:${action}`;
    const n = (this.attempts.get(k) ?? 0) + 1;
    this.attempts.set(k, n);
    return n <= this.max
      ? { allowed: true, retryAfterMs: 0 }
      : { allowed: false, retryAfterMs: 60_000 };
  }
}

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<UserId, User>();
  async get(id: UserId): Promise<User | undefined> {
    return this.users.get(id);
  }
  async upsert(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
  async remove(id: UserId): Promise<void> {
    this.users.delete(id);
  }
}

export class InMemoryUserCardRepository implements UserCardRepository {
  readonly cards = new Map<string, UserCard>();
  private key(ownerId: UserId, id: UserCardId): string {
    return `${ownerId}/${id}`;
  }
  async listByOwner(ownerId: UserId): Promise<UserCard[]> {
    return [...this.cards.values()].filter((c) => c.ownerId === ownerId);
  }
  async get(ownerId: UserId, id: UserCardId): Promise<UserCard | undefined> {
    return this.cards.get(this.key(ownerId, id));
  }
  async save(card: UserCard): Promise<void> {
    this.cards.set(this.key(card.ownerId, card.id), card);
  }
  async remove(ownerId: UserId, id: UserCardId): Promise<void> {
    this.cards.delete(this.key(ownerId, id));
  }
}

export class InMemoryAudienceRepository implements AudienceRepository {
  readonly audiences = new Map<GroupId, Audience>();
  readonly members = new Map<GroupId, Map<UserId, Membership & { name: string }>>();

  async get(id: GroupId): Promise<Audience | undefined> {
    return this.audiences.get(id);
  }
  async create(audience: Audience, owner: Membership, ownerName: string): Promise<void> {
    if (this.audiences.has(audience.id)) throw new Error(`audience ${audience.id} exists`);
    this.audiences.set(audience.id, audience.withCounts({ memberCount: 1 }));
    this.members.set(audience.id, new Map([[owner.userId, { ...owner, name: ownerName }]]));
  }
  async addMember(membership: Membership, memberName: string): Promise<void> {
    const a = this.audiences.get(membership.audienceId);
    if (!a) throw new Error('audience missing');
    const m = this.members.get(membership.audienceId)!;
    if (m.has(membership.userId)) return;
    a.assertCanAccept(m.size);
    m.set(membership.userId, { ...membership, name: memberName });
    this.audiences.set(a.id, a.withCounts({ memberCount: m.size }));
  }
  /** What each person's own membership list calls this audience (the peer's name for a 1:1). */
  readonly labels = new Map<string, string>();
  async createDirect(
    audience: Audience,
    members: readonly [DirectMember, DirectMember],
  ): Promise<void> {
    if (this.audiences.has(audience.id)) return;
    this.audiences.set(audience.id, audience.withCounts({ memberCount: 2 }));
    this.members.set(
      audience.id,
      new Map(members.map((m) => [m.membership.userId, { ...m.membership, name: m.name }])),
    );
    for (const m of members) this.labels.set(`${m.membership.userId}/${audience.id}`, m.peerName);
  }
  async removeMember(audienceId: GroupId, userId: UserId): Promise<void> {
    const m = this.members.get(audienceId);
    const a = this.audiences.get(audienceId);
    if (!m || !a) return;
    m.delete(userId);
    this.audiences.set(a.id, a.withCounts({ memberCount: m.size }));
  }
  async isMember(audienceId: GroupId, userId: UserId): Promise<boolean> {
    return this.members.get(audienceId)?.has(userId) ?? false;
  }
  async deleteAudience(id: GroupId): Promise<void> {
    for (const uid of this.members.get(id)?.keys() ?? []) this.labels.delete(`${uid}/${id}`);
    this.audiences.delete(id);
    this.members.delete(id);
  }
  async listForUser(userId: UserId): Promise<Audience[]> {
    return [...this.members.entries()]
      .filter(([, m]) => m.has(userId))
      .map(([id]) => this.audiences.get(id)!)
      .filter(Boolean);
  }
}

export class InMemoryInviteRepository implements InviteRepository {
  readonly invites = new Map<InviteCode, Invite>();
  async get(code: InviteCode): Promise<Invite | undefined> {
    return this.invites.get(code);
  }
  async create(invite: Invite): Promise<void> {
    this.invites.set(invite.code, invite);
  }
  async consume(invite: Invite): Promise<void> {
    this.invites.set(invite.code, invite);
  }
}

export class InMemoryGroupCardReadModel implements GroupCardReadModel {
  readonly rows = new Map<string, GroupCardRow>();
  /** cardCount per audience, maintained here the way the Firestore adapter maintains it. */
  readonly counts = new Map<GroupId, number>();
  private bump(audienceId: GroupId, by: number): void {
    this.counts.set(audienceId, Math.max(0, (this.counts.get(audienceId) ?? 0) + by));
  }
  private key(audienceId: GroupId, userCardId: UserCardId): string {
    return `${audienceId}/${userCardId}`;
  }
  async listByAudience(audienceId: GroupId): Promise<GroupCardRow[]> {
    return [...this.rows.values()].filter((r) => r.audienceId === audienceId);
  }
  async findHolders(audienceIds: readonly GroupId[], cardId: CardId): Promise<GroupCardRow[]> {
    const set = new Set(audienceIds);
    return [...this.rows.values()].filter((r) => set.has(r.audienceId) && r.cardId === cardId);
  }
  async findByTag(audienceIds: readonly GroupId[], tag: string): Promise<GroupCardRow[]> {
    const set = new Set(audienceIds);
    return [...this.rows.values()].filter((r) => set.has(r.audienceId) && r.tags.includes(tag));
  }
  async project(rows: readonly GroupCardRow[]): Promise<void> {
    for (const r of rows) {
      const k = this.key(r.audienceId, r.userCardId);
      if (!this.rows.has(k)) this.bump(r.audienceId, 1);
      this.rows.set(k, r);
    }
  }
  async unproject(refs: readonly { audienceId: GroupId; userCardId: UserCardId }[]): Promise<void> {
    for (const r of refs)
      if (this.rows.delete(this.key(r.audienceId, r.userCardId))) this.bump(r.audienceId, -1);
  }
}

export class FakePhoneHasher implements PhoneHasher {
  static hashOf(phone: string): string {
    return `hash:${phone.replace(/\d/g, (d) => 'abcdefghij'[Number(d)] ?? 'x')}`.padEnd(64, 'z');
  }
  hash(phone: string): string {
    return FakePhoneHasher.hashOf(phone);
  }
}

export class InMemoryContactRepository implements ContactRepository {
  readonly contacts = new Map<UserId, ContactRecord>();
  async get(userId: UserId): Promise<ContactRecord | undefined> {
    return this.contacts.get(userId);
  }
  async upsert(record: ContactRecord): Promise<void> {
    this.contacts.set(record.userId, record);
  }
  async remove(userId: UserId): Promise<void> {
    this.contacts.delete(userId);
  }
}

export class InMemoryCatalogMirror implements CatalogMirror {
  readonly docs = new Map<CardId, CatalogCard>();
  /** Documents written so far; tests reset it to prove a run wrote nothing. */
  writes = 0;
  async list(): Promise<CatalogCard[]> {
    return [...this.docs.values()];
  }
  async upsert(cards: readonly CatalogCard[]): Promise<void> {
    for (const c of cards) {
      this.docs.set(c.id, c);
      this.writes += 1;
    }
  }
}

export class InMemoryIdentityGateway implements IdentityGateway {
  readonly deleted: UserId[] = [];
  async deleteIdentity(id: UserId): Promise<void> {
    this.deleted.push(id);
  }
}

export class InMemoryPurger implements PersonalDataPurger {
  readonly purged: UserId[] = [];
  async purge(id: UserId): Promise<void> {
    this.purged.push(id);
  }
}
