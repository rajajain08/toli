import type { UserId } from '@toli/domain';
import type {
  AudienceRepository,
  ContactRepository,
  GroupCardReadModel,
  IdentityGateway,
  PersonalDataPurger,
  UserCardRepository,
  UserRepository,
} from '../ports';

export interface DeleteAccountResult {
  cardsRemoved: number;
  audiencesLeft: number;
  audiencesDeleted: number;
}

/**
 * Erases a person, immediately and completely. The only path that deletes users/{uid}.
 *
 * Order matters, because any step can fail and the whole thing must be safe to run again: what other
 * people can see goes first (so a half-finished delete never leaves someone's cards on a friend's screen),
 * then memberships, then the person's own data and phone record, and the sign-in identity last, because
 * it is what lets them press the button again. Every step is idempotent.
 *
 * A 1:1 share dies with either person. A group carries on without them; a group they leave empty is removed.
 */
export class DeleteAccount {
  constructor(
    private readonly users: UserRepository,
    private readonly cards: UserCardRepository,
    private readonly audiences: AudienceRepository,
    private readonly readModel: GroupCardReadModel,
    private readonly contacts: ContactRepository,
    private readonly purger: PersonalDataPurger,
    private readonly identity: IdentityGateway,
  ) {}

  async execute(cmd: { actor: UserId }): Promise<DeleteAccountResult> {
    const [cards, audiences] = await Promise.all([
      this.cards.listByOwner(cmd.actor),
      this.audiences.listForUser(cmd.actor),
    ]);

    // 1. Off every friend's screen. Done here, not left to the card trigger, which runs later and unordered.
    const refs = cards.flatMap((c) =>
      [...c.visibleTo].map((audienceId) => ({ audienceId, userCardId: c.id })),
    );
    if (refs.length > 0) await this.readModel.unproject(refs);

    // 2. Out of every audience.
    let audiencesDeleted = 0;
    for (const a of audiences) {
      if (a.isDirect || a.memberCount <= 1) {
        await this.audiences.deleteAudience(a.id);
        audiencesDeleted++;
      } else {
        await this.audiences.removeMember(a.id, cmd.actor);
      }
    }

    // 3. Their own data, the phone record, then the profile.
    for (const c of cards) await this.cards.remove(cmd.actor, c.id);
    await this.contacts.remove(cmd.actor);
    await this.purger.purge(cmd.actor);
    await this.users.remove(cmd.actor);

    // 4. The identity, last.
    await this.identity.deleteIdentity(cmd.actor);

    return {
      cardsRemoved: cards.length,
      audiencesLeft: audiences.length - audiencesDeleted,
      audiencesDeleted,
    };
  }
}
