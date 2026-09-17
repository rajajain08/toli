import { CardId, UserCard, UserCardId, UserId } from '@toli/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryUserCardRepository } from '../testing/index';
import { ListMyCards } from './list-my-cards';

describe('ListMyCards', () => {
  it('returns only the actor’s cards, newest first', async () => {
    const repo = new InMemoryUserCardRepository();
    const me = UserId('me');
    await repo.save(
      UserCard.create({
        id: UserCardId('a'),
        ownerId: me,
        cardId: CardId('c1'),
        now: new Date('2026-01-01'),
      }),
    );
    await repo.save(
      UserCard.create({
        id: UserCardId('b'),
        ownerId: me,
        cardId: CardId('c2'),
        now: new Date('2026-02-01'),
      }),
    );
    await repo.save(
      UserCard.create({
        id: UserCardId('c'),
        ownerId: UserId('other'),
        cardId: CardId('c3'),
        now: new Date(),
      }),
    );

    const result = await new ListMyCards(repo).execute({ actor: me });
    expect(result.map((c) => c.id)).toEqual(['b', 'a']);
  });
});
