import type { CardId, GroupId, UserCardId, UserId } from './ids';
import { LimitExceeded } from './errors';
import { LIMITS } from './limits';

/**
 * A card a user holds, identified only by its catalogue id. Visibility is a set of audience ids;
 * the read side (audiences/{aid}/cards) is projected from it by a function.
 */
export class UserCard {
  private constructor(
    readonly id: UserCardId,
    readonly ownerId: UserId,
    readonly cardId: CardId,
    readonly visibleTo: ReadonlySet<GroupId>,
    readonly addedAt: Date,
  ) {}

  static create(input: { id: UserCardId; ownerId: UserId; cardId: CardId; now: Date }): UserCard {
    return new UserCard(input.id, input.ownerId, input.cardId, new Set(), input.now);
  }

  static rehydrate(input: {
    id: UserCardId;
    ownerId: UserId;
    cardId: CardId;
    visibleTo: Iterable<GroupId>;
    addedAt: Date;
  }): UserCard {
    const visible = new Set(input.visibleTo);
    if (visible.size > LIMITS.audiencesPerCard)
      throw new LimitExceeded('audiences per card', LIMITS.audiencesPerCard);
    return new UserCard(input.id, input.ownerId, input.cardId, visible, input.addedAt);
  }

  isVisibleTo(audienceId: GroupId): boolean {
    return this.visibleTo.has(audienceId);
  }

  /** Returns a new card visible to `audienceId`. Idempotent. Throws past 50 audiences. */
  show(audienceId: GroupId): UserCard {
    if (this.visibleTo.has(audienceId)) return this;
    if (this.visibleTo.size >= LIMITS.audiencesPerCard)
      throw new LimitExceeded('audiences per card', LIMITS.audiencesPerCard);
    const next = new Set(this.visibleTo);
    next.add(audienceId);
    return new UserCard(this.id, this.ownerId, this.cardId, next, this.addedAt);
  }

  /** Returns a new card hidden from `audienceId`. Idempotent. */
  hide(audienceId: GroupId): UserCard {
    if (!this.visibleTo.has(audienceId)) return this;
    const next = new Set(this.visibleTo);
    next.delete(audienceId);
    return new UserCard(this.id, this.ownerId, this.cardId, next, this.addedAt);
  }

  /** Audiences added and removed between two versions of the same card. Used by the projection. */
  static diffVisibility(
    before: ReadonlySet<GroupId> | undefined,
    after: ReadonlySet<GroupId> | undefined,
  ): { added: GroupId[]; removed: GroupId[] } {
    const b = before ?? new Set<GroupId>();
    const a = after ?? new Set<GroupId>();
    return {
      added: [...a].filter((id) => !b.has(id)),
      removed: [...b].filter((id) => !a.has(id)),
    };
  }
}
