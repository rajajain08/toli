import {
  Invite,
  INVITE_ALPHABET,
  LIMITS,
  NotAMember,
  NotFound,
  type GroupId,
  type UserId,
} from '@toli/domain';
import type { AudienceRepository, Clock, IdGenerator, InviteRepository } from '../ports';

/** Any member can mint an invite link for a group. Direct (1:1) audiences are never joinable by link. */
export class CreateInvite {
  constructor(
    private readonly audiences: AudienceRepository,
    private readonly invites: InviteRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: { actor: UserId; audienceId: GroupId }): Promise<Invite> {
    const audience = await this.audiences.get(cmd.audienceId);
    if (!audience || audience.isDirect) throw new NotFound('group');
    if (!(await this.audiences.isMember(cmd.audienceId, cmd.actor))) throw new NotAMember();
    // Codes are unguessable, not unique by construction; retry the rare collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const invite = Invite.create({
        audienceId: cmd.audienceId,
        randomIndices: this.ids.randomIndices(LIMITS.inviteCodeLength, INVITE_ALPHABET.length),
        now: this.clock.now(),
      });
      if (!(await this.invites.get(invite.code))) {
        await this.invites.create(invite);
        return invite;
      }
    }
    throw new Error('could not allocate an invite code');
  }
}
