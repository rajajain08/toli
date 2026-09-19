import type { GroupCardReadModel, GroupCardRow } from '@toli/application';
import type { CardId, GroupId } from '@toli/domain';
import { getDocs, query, where, type Firestore } from 'firebase/firestore';
import { audienceCardsQuery } from './queries';

const readOnly = (): never => {
  throw new Error('the read side is written by the projection function, never by a client');
};

/**
 * Client side of the read model. Find at MVP scale (docs/architecture.md, "Find, by stage"): one query per
 * membership, in parallel, each a single-field filter so no composite index is needed. Rules let a member
 * read each audience's cards, so these are ordinary client reads and are served from the cache offline.
 */
export class FirestoreGroupCardReader implements GroupCardReadModel {
  constructor(private readonly db: Firestore) {}

  private async across(
    audienceIds: readonly GroupId[],
    field: string,
    op: '==' | 'array-contains',
    value: string,
  ): Promise<GroupCardRow[]> {
    const perAudience = await Promise.all(
      audienceIds.map(async (aid) => {
        const live = audienceCardsQuery(this.db, aid);
        // The live query is ordered for the group screen; Find filters instead, on the bare collection.
        const snap = await getDocs(query(live.collection, where(field, op, value)));
        return snap.docs.map(live.convert);
      }),
    );
    return perAudience.flat();
  }

  async listByAudience(audienceId: GroupId): Promise<GroupCardRow[]> {
    const live = audienceCardsQuery(this.db, audienceId);
    return (await getDocs(live.query)).docs.map(live.convert);
  }

  findHolders(audienceIds: readonly GroupId[], cardId: CardId): Promise<GroupCardRow[]> {
    return this.across(audienceIds, 'cardId', '==', cardId);
  }

  findByTag(audienceIds: readonly GroupId[], tag: string): Promise<GroupCardRow[]> {
    return this.across(audienceIds, 'tags', 'array-contains', tag);
  }

  project = readOnly;
  unproject = readOnly;
}
