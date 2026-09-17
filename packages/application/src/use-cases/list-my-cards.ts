import type { UserCard, UserId } from '@toli/domain';
import type { UserCardRepository } from '../ports/index';

export class ListMyCards {
  constructor(private readonly cards: UserCardRepository) {}

  async execute(query: { actor: UserId }): Promise<UserCard[]> {
    const cards = await this.cards.listByOwner(query.actor);
    return [...cards].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  }
}
