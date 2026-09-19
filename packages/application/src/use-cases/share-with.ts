import {
  Audience,
  createMembership,
  InvalidArgument,
  LimitExceeded,
  NotConnected,
  NotFound,
  RateLimited,
  type UserId,
} from '@toli/domain';
import type { AudienceRepository, Clock, RateLimiter, UserRepository } from '../ports';

export const MAX_DIRECT_SHARES_PER_USER = 30;

/**
 * Opens a 1:1 share: a two-member `direct` audience with a deterministic id, so it can never exist twice
 * (ADR-0004). It only creates the audience; which cards are visible in it is the owner's own write, the
 * same as for a group. You can only open one with someone who is already in one of your groups, so a
 * stranger's uid is useless here. Idempotent.
 */
export class ShareWith {
  constructor(
    private readonly audiences: AudienceRepository,
    private readonly users: UserRepository,
    private readonly limiter: RateLimiter,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: {
    actor: UserId;
    target: UserId;
  }): Promise<{ audience: Audience; created: boolean }> {
    if (cmd.actor === cmd.target) throw new InvalidArgument('you cannot share with yourself');
    const gate = await this.limiter.attempt(cmd.actor, 'share');
    if (!gate.allowed) throw new RateLimited(gate.retryAfterMs);

    const existing = await this.audiences.get(Audience.directId(cmd.actor, cmd.target));
    if (existing) return { audience: existing, created: false };

    const [actor, target] = await Promise.all([
      this.users.get(cmd.actor),
      this.users.get(cmd.target),
    ]);
    if (!actor || !target) throw new NotFound('user');

    const mine = await this.audiences.listForUser(cmd.actor);
    const groups = mine.filter((a) => !a.isDirect);
    const connected = (
      await Promise.all(groups.map((g) => this.audiences.isMember(g.id, cmd.target)))
    ).some(Boolean);
    if (!connected) throw new NotConnected();
    if (mine.filter((a) => a.isDirect).length >= MAX_DIRECT_SHARES_PER_USER)
      throw new LimitExceeded('people you share with', MAX_DIRECT_SHARES_PER_USER);

    const now = this.clock.now();
    const audience = Audience.createDirect({
      a: cmd.actor,
      b: cmd.target,
      createdBy: cmd.actor,
      now,
    });
    await this.audiences.createDirect(audience, [
      {
        membership: createMembership({
          audienceId: audience.id,
          userId: cmd.actor,
          role: 'owner',
          now,
        }),
        name: actor.name,
        peerName: target.name,
      },
      {
        membership: createMembership({
          audienceId: audience.id,
          userId: cmd.target,
          role: 'member',
          now,
        }),
        name: target.name,
        peerName: actor.name,
      },
    ]);
    return { audience: audience.withCounts({ memberCount: 2 }), created: true };
  }
}
