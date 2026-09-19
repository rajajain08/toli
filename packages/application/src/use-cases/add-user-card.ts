import {
  InvalidArgument,
  LimitExceeded,
  UserCard,
  UserCardId,
  type CardId,
  type UserId,
} from '@toli/domain';
import type { Clock, IdGenerator, UserCardRepository } from '../ports';

/** Whether a catalogue id exists. The web app backs it with the bundled catalogue; no network. */
export interface CardCatalog {
  has(cardId: CardId): boolean;
}

export const MAX_CARDS_PER_USER = 30;

/**
 * Adds a catalogue card to the actor's wallet. Idempotent per catalogue card: adding a card the
 * actor already holds returns the existing one, so a double tap or an offline replay cannot duplicate.
 */
export class AddUserCard {
  constructor(
    private readonly cards: UserCardRepository,
    private readonly catalog: CardCatalog,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: { actor: UserId; cardId: CardId; id?: UserCardId }): Promise<UserCard> {
    if (!this.catalog.has(cmd.cardId)) throw new InvalidArgument(`unknown card ${cmd.cardId}`);
    const mine = await this.cards.listByOwner(cmd.actor);
    const existing = mine.find((c) => c.cardId === cmd.cardId);
    if (existing) return existing;
    if (mine.length >= MAX_CARDS_PER_USER)
      throw new LimitExceeded('cards per user', MAX_CARDS_PER_USER);
    const card = UserCard.create({
      id: cmd.id ?? UserCardId(this.ids.newId()),
      ownerId: cmd.actor,
      cardId: cmd.cardId,
      now: this.clock.now(),
    });
    await this.cards.save(card);
    return card;
  }
}
