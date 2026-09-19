import type { AudienceType, CardId, GroupId, UserId } from '@toli/domain';
import type { AudienceRepository, GroupCardReadModel, GroupCardRow } from '../ports';

export interface HolderVia {
  audienceId: GroupId;
  type: AudienceType;
  /** Group name; undefined for a 1:1 share. */
  name: string | undefined;
}

export interface CardHolder {
  ownerId: UserId;
  ownerName: string;
  via: HolderVia[];
}

export interface HeldCard {
  cardId: CardId;
  name: string;
  issuer: string;
  color: string;
  tags: readonly string[];
  holders: CardHolder[];
}

const group = (
  rows: readonly GroupCardRow[],
  actor: UserId,
  audiences: Map<GroupId, HolderVia>,
): HeldCard[] => {
  const cards = new Map<CardId, HeldCard & { byOwner: Map<UserId, CardHolder> }>();
  for (const r of rows) {
    if (r.ownerId === actor) continue;
    const via = audiences.get(r.audienceId);
    if (!via) continue;
    let card = cards.get(r.cardId);
    if (!card) {
      card = {
        cardId: r.cardId,
        name: r.name,
        issuer: r.issuer,
        color: r.color,
        tags: r.tags,
        holders: [],
        byOwner: new Map(),
      };
      cards.set(r.cardId, card);
    }
    let holder = card.byOwner.get(r.ownerId);
    if (!holder) {
      holder = { ownerId: r.ownerId, ownerName: r.ownerName, via: [] };
      card.byOwner.set(r.ownerId, holder);
      card.holders.push(holder);
    }
    // The same person can be reached through a group and a 1:1 share; list both, once each.
    if (!holder.via.some((v) => v.audienceId === via.audienceId)) holder.via.push(via);
  }
  return [...cards.values()]
    .map(({ byOwner: _drop, ...card }) => ({
      ...card,
      holders: card.holders.sort((a, b) => a.ownerName.localeCompare(b.ownerName)),
    }))
    .sort((a, b) => b.holders.length - a.holders.length || a.name.localeCompare(b.name));
};

/**
 * "Who has this card?" across every audience the actor is in. The adapter decides how to search (one
 * query per membership at MVP, collectionGroup later, Typesense after that); this stays the same.
 * Your own cards are never in the answer, and a person appears once however many ways you know them.
 */
export class FindCardHolders {
  constructor(
    private readonly readModel: GroupCardReadModel,
    private readonly audiences: AudienceRepository,
  ) {}

  private async reach(actor: UserId): Promise<Map<GroupId, HolderVia>> {
    const mine = await this.audiences.listForUser(actor);
    return new Map(mine.map((a) => [a.id, { audienceId: a.id, type: a.type, name: a.name }]));
  }

  async execute(query: { actor: UserId; cardId: CardId }): Promise<CardHolder[]> {
    const reach = await this.reach(query.actor);
    if (reach.size === 0) return [];
    const rows = await this.readModel.findHolders([...reach.keys()], query.cardId);
    return group(rows, query.actor, reach)[0]?.holders ?? [];
  }

  /** "Or find by perk": every card with that tag that someone you know holds, most-held first. */
  async byTag(query: { actor: UserId; tag: string }): Promise<HeldCard[]> {
    const reach = await this.reach(query.actor);
    if (reach.size === 0) return [];
    return group(await this.readModel.findByTag([...reach.keys()], query.tag), query.actor, reach);
  }
}
