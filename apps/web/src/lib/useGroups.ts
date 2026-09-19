'use client';
import type { GroupCardRow } from '@toli/application';
import { GroupId, UserId, type UserCard, type UserCardId } from '@toli/domain';
import type { AudienceSummary, MemberRow, MembershipRow, Peer } from '@toli/infra-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { track } from './analytics';
import { useAuth } from './auth';
import { getContainer } from './container';
import { useLiveCollection } from './useLiveCollection';
import { useLiveDoc } from './useLiveDoc';

export const useUid = (): string | undefined => {
  const { state } = useAuth();
  return state.status === 'signedIn' ? state.user.uid : undefined;
};

/** The audiences the signed-in person belongs to, from their own membership list. One listener. */
export function useMyGroups() {
  const uid = useUid();
  return useLiveCollection<MembershipRow>(['my-groups', uid ?? '-'], uid ? (infra, db) => infra.myMembershipsQuery(db, UserId(uid)) : null);
}

export const useAudience = (aid: string | undefined) =>
  useLiveDoc<AudienceSummary>(['audience', aid ?? '-'], aid ? (infra, db) => infra.audienceDoc(db, GroupId(aid)) : null);

export const useAudienceMembers = (aid: string | undefined) =>
  useLiveCollection<MemberRow>(['audience-members', aid ?? '-'], aid ? (infra, db) => infra.audienceMembersQuery(db, GroupId(aid)) : null);

export const useAudienceCards = (aid: string | undefined) =>
  useLiveCollection<GroupCardRow>(['audience-cards', aid ?? '-'], aid ? (infra, db) => infra.audienceCardsQuery(db, GroupId(aid)) : null);

/** Optimistic visibility toggle on the wallet cache, with rollback. The trigger updates the group's read side. */
export function useSetVisibility() {
  const uid = useUid();
  const client = useQueryClient();
  const key = ['my-cards', uid ?? 'signed-out'];
  return useMutation({
    mutationFn: async (input: { cardId: UserCardId; audienceId: string; visible: boolean }) => {
      if (!uid) throw new Error('not signed in');
      const c = await getContainer();
      return c.setCardVisibility.execute({ actor: UserId(uid), cardId: input.cardId, audienceId: GroupId(input.audienceId), visible: input.visible });
    },
    onMutate: async (input) => {
      const previous = client.getQueryData<UserCard[]>(key);
      client.setQueryData<UserCard[]>(
        key,
        (previous ?? []).map((c) => (c.id === input.cardId ? (input.visible ? c.show(GroupId(input.audienceId)) : c.hide(GroupId(input.audienceId))) : c)),
      );
      return { previous };
    },
    onError: (_e, _i, ctx) => client.setQueryData(key, ctx?.previous),
    onSuccess: (_c, input) => void track('visibility_changed', { visible: input.visible }),
  });
}

/** People in your groups, for the "share with a person" picker. One-shot, refreshed when the screen opens. */
export function usePeers() {
  const uid = useUid();
  return useQuery<Peer[]>({
    queryKey: ['peers', uid ?? '-'],
    enabled: uid !== undefined,
    staleTime: 0,
    queryFn: async () => {
      const c = await getContainer();
      return c.infra.listPeers(c.db, UserId(uid!));
    },
  });
}
