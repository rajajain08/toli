import type { GroupId, UserId } from './ids';
import { GroupId as makeGroupId } from './ids';
import { AudienceFull, InvalidArgument } from './errors';
import { LIMITS } from './limits';

export type AudienceType = 'group' | 'direct';

/**
 * A set of people who can see some cards. A 1:1 share is an Audience of type `direct`
 * with exactly two members (ADR-0004); only the UI label differs.
 */
export class Audience {
  private constructor(
    readonly id: GroupId,
    readonly type: AudienceType,
    readonly name: string | undefined,
    readonly createdBy: UserId,
    readonly memberCount: number,
    readonly cardCount: number,
    readonly createdAt: Date,
  ) {}

  static createGroup(input: { id: GroupId; name: string; createdBy: UserId; now: Date }): Audience {
    const name = Audience.normaliseName(input.name);
    return new Audience(input.id, 'group', name, input.createdBy, 0, 0, input.now);
  }

  static createDirect(input: { a: UserId; b: UserId; createdBy: UserId; now: Date }): Audience {
    if (input.a === input.b) throw new InvalidArgument('cannot share with yourself');
    if (input.createdBy !== input.a && input.createdBy !== input.b)
      throw new InvalidArgument('a direct audience is created by one of its two members');
    return new Audience(
      Audience.directId(input.a, input.b),
      'direct',
      undefined,
      input.createdBy,
      0,
      0,
      input.now,
    );
  }

  static rehydrate(input: {
    id: GroupId;
    type: AudienceType;
    name?: string | undefined;
    createdBy: UserId;
    memberCount: number;
    cardCount: number;
    createdAt: Date;
  }): Audience {
    return new Audience(
      input.id,
      input.type,
      input.name,
      input.createdBy,
      input.memberCount,
      input.cardCount,
      input.createdAt,
    );
  }

  /** Deterministic id for a 1:1 share so it can never exist twice. */
  static directId(a: UserId, b: UserId): GroupId {
    if (a === b) throw new InvalidArgument('cannot share with yourself');
    const [lo, hi] = a < b ? [a, b] : [b, a];
    return makeGroupId(`direct_${lo}_${hi}`);
  }

  static isDirectId(id: string): boolean {
    return id.startsWith('direct_');
  }

  static normaliseName(raw: string): string {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (name.length === 0) throw new InvalidArgument('audience name is required');
    if (name.length > LIMITS.audienceNameMaxLength)
      throw new InvalidArgument(
        `audience name must be at most ${LIMITS.audienceNameMaxLength} characters`,
      );
    return name;
  }

  get isDirect(): boolean {
    return this.type === 'direct';
  }

  /** Whether the audience can accept one more member at the given count. Direct audiences hold exactly two. */
  canAccept(memberCount: number = this.memberCount): boolean {
    const cap = this.type === 'direct' ? 2 : LIMITS.membersPerAudience;
    return memberCount < cap;
  }

  assertCanAccept(memberCount: number = this.memberCount): void {
    if (!this.canAccept(memberCount))
      throw new AudienceFull(this.type === 'direct' ? 2 : LIMITS.membersPerAudience);
  }

  withCounts(patch: { memberCount?: number; cardCount?: number }): Audience {
    return new Audience(
      this.id,
      this.type,
      this.name,
      this.createdBy,
      Math.max(0, patch.memberCount ?? this.memberCount),
      Math.max(0, patch.cardCount ?? this.cardCount),
      this.createdAt,
    );
  }
}
