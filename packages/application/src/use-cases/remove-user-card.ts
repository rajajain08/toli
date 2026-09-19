import type { UserCardId, UserId } from '@toli/domain';
import type { UserCardRepository } from '../ports';

/** Removes a card from the actor's wallet. Idempotent. The projection trigger removes the read-model rows. */
export class RemoveUserCard {
  constructor(private readonly cards: UserCardRepository) {}

  async execute(cmd: { actor: UserId; cardId: UserCardId }): Promise<void> {
    await this.cards.remove(cmd.actor, cmd.cardId);
  }
}
