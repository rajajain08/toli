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
import type {
  AudienceRepository,
  Clock,
  GroupCardReadModel,
  GroupCardRow,
  IdGenerator,
  InviteRepository,
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
  randomIndices(count: number, bound: number): number[] {
    return Array.from({ length: count }, (_, i) => (this.n + i) % bound);
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
  async create(audience: Audience, owner: Membership): Promise<void> {
    if (this.audiences.has(audience.id)) throw new Error(`audience ${audience.id} exists`);
    this.audiences.set(audience.id, audience.withCounts({ memberCount: 1 }));
    this.members.set(audience.id, new Map([[owner.userId, { ...owner, name: '' }]]));
  }
  async addMember(membership: Membership, memberName: string): Promise<void> {
    const a = this.audiences.get(membership.audienceId);
    if (!a) throw new Error('audience missing');
    const m = this.members.get(membership.audienceId)!;
    if (m.has(membership.userId)) return;
    m.set(membership.userId, { ...membership, name: memberName });
    this.audiences.set(a.id, a.withCounts({ memberCount: m.size }));
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
  async project(rows: readonly GroupCardRow[]): Promise<void> {
    for (const r of rows) this.rows.set(this.key(r.audienceId, r.userCardId), r);
  }
  async unproject(refs: readonly { audienceId: GroupId; userCardId: UserCardId }[]): Promise<void> {
    for (const r of refs) this.rows.delete(this.key(r.audienceId, r.userCardId));
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
