import {
  NotAMember,
  NotFound,
  type GroupId,
  type UserCard,
  type UserCardId,
  type UserId,
} from '@toli/domain';
import type { AudienceRepository, UserCardRepository } from '../ports';

/** Shows or hides one of the actor's cards to an audience they belong to. */
export class SetCardVisibility {
  constructor(
    private readonly cards: UserCardRepository,
    private readonly audiences: AudienceRepository,
  ) {}

  async execute(cmd: {
    actor: UserId;
    cardId: UserCardId;
    audienceId: GroupId;
    visible: boolean;
  }): Promise<UserCard> {
    const card = await this.cards.get(cmd.actor, cmd.cardId);
    if (!card) throw new NotFound('card');
    // Hiding never needs membership: a person who left a group must still be able to withdraw a card.
    if (cmd.visible && !(await this.audiences.isMember(cmd.audienceId, cmd.actor)))
      throw new NotAMember();
    const next = cmd.visible ? card.show(cmd.audienceId) : card.hide(cmd.audienceId);
    if (next !== card) await this.cards.save(next);
    return next;
  }
}
