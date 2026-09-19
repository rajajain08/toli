'use client';
import { AddUserCard, FindCardHolders, ListMyCards, RemoveUserCard, SetCardVisibility } from '@toli/application';
import { loadFirebase, type Loaded } from './firebase';

/**
 * Composition root for the web app: the only place adapters meet use cases. Async because Firebase is
 * lazy, and so is the catalogue: it is only needed to validate a card id on add, so it must not ride along
 * in the shell of pages that never show a card (sign-in, the invite landing page).
 */
async function build({ infra, fb }: Loaded) {
  const { getCatalogCard } = await import('@toli/catalog');
  const cards = new infra.FirestoreUserCardRepository(fb.db);
  const users = new infra.FirestoreUserRepository(fb.db);
  const audiences = new infra.FirestoreAudienceReader(fb.db);
  const groupCards = new infra.FirestoreGroupCardReader(fb.db);
  const clock = new infra.BrowserClock();
  const ids = new infra.BrowserIdGenerator();
  const catalog = { has: (id: string) => getCatalogCard(id) !== undefined };
  return {
    db: fb.db,
    infra,
    ids,
    users,
    cards,
    audiences,
    listMyCards: new ListMyCards(cards),
    addUserCard: new AddUserCard(cards, catalog, ids, clock),
    removeUserCard: new RemoveUserCard(cards),
    setCardVisibility: new SetCardVisibility(cards, audiences),
    findCardHolders: new FindCardHolders(groupCards, audiences),
  };
}

export type Container = Awaited<ReturnType<typeof build>>;

let cached: Promise<Container> | undefined;
export const getContainer = (): Promise<Container> => (cached ??= loadFirebase().then(build));
