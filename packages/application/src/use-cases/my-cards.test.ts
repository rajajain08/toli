import {
  Audience,
  CardId,
  createMembership,
  GroupId,
  InvalidArgument,
  LimitExceeded,
  NotAMember,
  NotFound,
  UserCardId,
  UserId,
} from '@toli/domain';
import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryAudienceRepository,
  InMemoryUserCardRepository,
  SequentialIds,
} from '../testing';
import { AddUserCard, MAX_CARDS_PER_USER } from './add-user-card';
import { RemoveUserCard } from './remove-user-card';
import { SetCardVisibility } from './set-card-visibility';

const me = UserId('me');
const known = new Set([
  'hdfc-millennia',
  'axis-atlas',
  ...Array.from({ length: 40 }, (_, i) => `card-${i}`),
]);
const catalog = { has: (id: string) => known.has(id) };

const setup = () => {
  const cards = new InMemoryUserCardRepository();
  const audiences = new InMemoryAudienceRepository();
  const clock = new FixedClock();
  return {
    cards,
    audiences,
    clock,
    add: new AddUserCard(cards, catalog, new SequentialIds('uc'), clock),
    remove: new RemoveUserCard(cards),
    setVisibility: new SetCardVisibility(cards, audiences),
  };
};

describe('AddUserCard', () => {
  it('adds a catalogue card, private by default', async () => {
    const { add, cards, clock } = setup();
    const card = await add.execute({ actor: me, cardId: CardId('hdfc-millennia') });
    expect(card.ownerId).toBe(me);
    expect(card.visibleTo.size).toBe(0);
    expect(card.addedAt).toEqual(clock.now());
    expect(await cards.listByOwner(me)).toHaveLength(1);
  });

  it('rejects a card that is not in the catalogue', async () => {
    const { add } = setup();
    await expect(add.execute({ actor: me, cardId: CardId('made-up') })).rejects.toThrow(
      InvalidArgument,
    );
  });

  it('is idempotent per catalogue card', async () => {
    const { add, cards } = setup();
    const a = await add.execute({ actor: me, cardId: CardId('axis-atlas') });
    const b = await add.execute({ actor: me, cardId: CardId('axis-atlas') });
    expect(b.id).toBe(a.id);
    expect(await cards.listByOwner(me)).toHaveLength(1);
  });

  it('honours a client-chosen id so an optimistic row and the stored row are the same', async () => {
    const { add } = setup();
    const card = await add.execute({
      actor: me,
      cardId: CardId('axis-atlas'),
      id: UserCardId('optimistic-1'),
    });
    expect(card.id).toBe('optimistic-1');
  });

  it('caps a wallet at 30 cards', async () => {
    const { add } = setup();
    for (let i = 0; i < MAX_CARDS_PER_USER; i++)
      await add.execute({ actor: me, cardId: CardId(`card-${i}`) });
    await expect(add.execute({ actor: me, cardId: CardId('card-35') })).rejects.toThrow(
      LimitExceeded,
    );
  });

  it('keeps wallets separate per owner', async () => {
    const { add, cards } = setup();
    await add.execute({ actor: me, cardId: CardId('axis-atlas') });
    await add.execute({ actor: UserId('other'), cardId: CardId('axis-atlas') });
    expect(await cards.listByOwner(me)).toHaveLength(1);
  });
});

describe('RemoveUserCard', () => {
  it('removes the card and is idempotent', async () => {
    const { add, remove, cards } = setup();
    const card = await add.execute({ actor: me, cardId: CardId('axis-atlas') });
    await remove.execute({ actor: me, cardId: card.id });
    await remove.execute({ actor: me, cardId: card.id });
    expect(await cards.listByOwner(me)).toHaveLength(0);
  });

  it('cannot remove someone else’s card', async () => {
    const { add, remove, cards } = setup();
    const theirs = await add.execute({ actor: UserId('other'), cardId: CardId('axis-atlas') });
    await remove.execute({ actor: me, cardId: theirs.id });
    expect(await cards.listByOwner(UserId('other'))).toHaveLength(1);
  });
});

describe('SetCardVisibility', () => {
  const g1 = GroupId('g1');
  const withGroup = async () => {
    const s = setup();
    const now = s.clock.now();
    await s.audiences.create(
      Audience.createGroup({ id: g1, name: 'Crew', createdBy: me, now }),
      createMembership({ audienceId: g1, userId: me, role: 'owner', now }),
    );
    const card = await s.add.execute({ actor: me, cardId: CardId('axis-atlas') });
    return { ...s, card };
  };

  it('shows and hides a card for an audience the actor belongs to', async () => {
    const { setVisibility, card, cards } = await withGroup();
    await setVisibility.execute({ actor: me, cardId: card.id, audienceId: g1, visible: true });
    expect((await cards.get(me, card.id))!.isVisibleTo(g1)).toBe(true);
    await setVisibility.execute({ actor: me, cardId: card.id, audienceId: g1, visible: false });
    expect((await cards.get(me, card.id))!.isVisibleTo(g1)).toBe(false);
  });

  it('refuses to show a card to an audience the actor is not in', async () => {
    const { setVisibility, card } = await withGroup();
    await expect(
      setVisibility.execute({
        actor: me,
        cardId: card.id,
        audienceId: GroupId('strangers'),
        visible: true,
      }),
    ).rejects.toThrow(NotAMember);
  });

  it('lets a person who left a group still hide their card from it', async () => {
    const { setVisibility, card, audiences, cards } = await withGroup();
    await setVisibility.execute({ actor: me, cardId: card.id, audienceId: g1, visible: true });
    await audiences.removeMember(g1, me);
    await setVisibility.execute({ actor: me, cardId: card.id, audienceId: g1, visible: false });
    expect((await cards.get(me, card.id))!.visibleTo.size).toBe(0);
  });

  it('fails for a card the actor does not own', async () => {
    const { setVisibility } = await withGroup();
    await expect(
      setVisibility.execute({
        actor: me,
        cardId: UserCardId('nope'),
        audienceId: g1,
        visible: true,
      }),
    ).rejects.toThrow(NotFound);
  });
});
