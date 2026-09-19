import { Invite } from '@toli/domain';
import type { AudienceRepository, Clock, InviteRepository, UserRepository } from '../ports';

export interface InvitePreview {
  groupName: string;
  inviterName: string;
  memberCount: number;
  cardCount: number;
}

/**
 * What the invite link may show before anyone signs in: group name, who started it and two counts.
 * Never member names, never cards. Returns undefined for anything unusable so the page says one thing.
 */
export class GetInvitePreview {
  constructor(
    private readonly invites: InviteRepository,
    private readonly audiences: AudienceRepository,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(query: { code: string }): Promise<InvitePreview | undefined> {
    let code;
    try {
      code = Invite.parseCode(query.code);
    } catch {
      return undefined;
    }
    const invite = await this.invites.get(code);
    if (!invite || !invite.isValidAt(this.clock.now())) return undefined;
    const audience = await this.audiences.get(invite.audienceId);
    if (!audience || audience.isDirect) return undefined;
    const inviter = await this.users.get(audience.createdBy);
    return {
      groupName: audience.name ?? 'a group',
      inviterName: inviter?.name ?? 'A friend',
      memberCount: audience.memberCount,
      cardCount: audience.cardCount,
    };
  }
}
