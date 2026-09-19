import {
  createMembership,
  Invite,
  InvalidInvite,
  NotFound,
  RateLimited,
  type Audience,
  type UserId,
} from '@toli/domain';
import type {
  AudienceRepository,
  Clock,
  InviteRepository,
  RateLimiter,
  UserRepository,
} from '../ports';

/**
 * Joins a group through an invite code. Rate limited per actor before anything is looked up, so the
 * endpoint cannot be used to probe for codes. Idempotent: someone who is already in does not burn a use.
 */
export class JoinByInvite {
  constructor(
    private readonly audiences: AudienceRepository,
    private readonly invites: InviteRepository,
    private readonly users: UserRepository,
    private readonly limiter: RateLimiter,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: {
    actor: UserId;
    code: string;
  }): Promise<{ audience: Audience; alreadyMember: boolean }> {
    const gate = await this.limiter.attempt(cmd.actor, 'join');
    if (!gate.allowed) throw new RateLimited(gate.retryAfterMs);

    const code = Invite.parseCode(cmd.code);
    const invite = await this.invites.get(code);
    // Unknown and malformed look the same from outside.
    if (!invite) throw new InvalidInvite('unknown');
    const now = this.clock.now();
    invite.assertValidAt(now);

    const audience = await this.audiences.get(invite.audienceId);
    if (!audience || audience.isDirect) throw new InvalidInvite('unknown');
    if (await this.audiences.isMember(audience.id, cmd.actor))
      return { audience, alreadyMember: true };

    const user = await this.users.get(cmd.actor);
    if (!user) throw new NotFound('user');
    audience.assertCanAccept();

    await this.audiences.addMember(
      createMembership({ audienceId: audience.id, userId: cmd.actor, role: 'member', now }),
      user.name,
    );
    await this.invites.consume(invite.consume(now));
    return {
      audience: audience.withCounts({ memberCount: audience.memberCount + 1 }),
      alreadyMember: false,
    };
  }
}
