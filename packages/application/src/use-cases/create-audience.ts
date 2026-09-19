import {
  Audience,
  createMembership,
  GroupId,
  LimitExceeded,
  NotFound,
  type UserId,
} from '@toli/domain';
import type { AudienceRepository, Clock, IdGenerator, UserRepository } from '../ports';

/** Keeps Find cheap (one query per membership at MVP) and bounds what one account can create. */
export const MAX_AUDIENCES_PER_USER = 20;

/** Creates a group with the actor as its owner and first member. Runs on the server only. */
export class CreateAudience {
  constructor(
    private readonly audiences: AudienceRepository,
    private readonly users: UserRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: { actor: UserId; name: string }): Promise<Audience> {
    const user = await this.users.get(cmd.actor);
    if (!user) throw new NotFound('user');
    const mine = await this.audiences.listForUser(cmd.actor);
    if (mine.length >= MAX_AUDIENCES_PER_USER)
      throw new LimitExceeded('audiences per user', MAX_AUDIENCES_PER_USER);
    const now = this.clock.now();
    const audience = Audience.createGroup({
      id: GroupId(this.ids.newId()),
      name: cmd.name,
      createdBy: cmd.actor,
      now,
    });
    await this.audiences.create(
      audience,
      createMembership({ audienceId: audience.id, userId: cmd.actor, role: 'owner', now }),
      user.name,
    );
    return audience.withCounts({ memberCount: 1 });
  }
}
