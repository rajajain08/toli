'use client';
import { CardId, UserCard, UserCardId, UserId } from '@toli/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { track } from './analytics';
import { getContainer } from './container';
import { useUid } from './useGroups';
import { useLiveCollection } from './useLiveCollection';

const keyFor = (uid: string | undefined) => ['my-cards', uid ?? 'signed-out'] as const;


/** The signed-in user's wallet, live from Firestore (and from IndexedDB before the network answers). */
export function useMyCards() {
  const uid = useUid();
  return useLiveCollection<UserCard>(keyFor(uid), uid ? (infra, db) => infra.myCardsQuery(db, UserId(uid)) : null);
}

const newLocalId = (): UserCardId => UserCardId(`c${crypto.randomUUID().replace(/-/g, '').slice(0, 19)}`);

/** Optimistic add: the row appears at once with a client-chosen id, and rolls back if the write fails. */
export function useAddCard() {
  const uid = useUid();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cardId: string; id: UserCardId }) => {
      if (!uid) throw new Error('not signed in');
      const c = await getContainer();
      return c.addUserCard.execute({ actor: UserId(uid), cardId: CardId(input.cardId), id: input.id });
    },
    onMutate: async (input) => {
      const key = keyFor(uid);
      const previous = client.getQueryData<UserCard[]>(key);
      if (uid && !(previous ?? []).some((c) => c.cardId === input.cardId)) {
        const optimistic = UserCard.create({ id: input.id, ownerId: UserId(uid), cardId: CardId(input.cardId), now: new Date() });
        client.setQueryData<UserCard[]>(key, [optimistic, ...(previous ?? [])]);
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => client.setQueryData(keyFor(uid), ctx?.previous),
    onSuccess: (_card, input) => void track('card_added', { card_id: input.cardId }),
  });
}

/** Optimistic remove with rollback. */
export function useRemoveCard() {
  const uid = useUid();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: UserCardId) => {
      if (!uid) throw new Error('not signed in');
      const c = await getContainer();
      await c.removeUserCard.execute({ actor: UserId(uid), cardId: id });
    },
    onMutate: async (id) => {
      const key = keyFor(uid);
      const previous = client.getQueryData<UserCard[]>(key);
      client.setQueryData<UserCard[]>(key, (previous ?? []).filter((c) => c.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => client.setQueryData(keyFor(uid), ctx?.previous),
  });
}

export { newLocalId };
