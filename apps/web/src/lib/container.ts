'use client';
import { AddUserCard, ListMyCards, RemoveUserCard, SetCardVisibility } from '@toli/application';
import { getCatalogCard } from '@toli/catalog';
import { loadFirebase, type Loaded } from './firebase';

/** Composition root for the web app: the only place adapters meet use cases. Async because Firebase is lazy. */
function build({ infra, fb }: Loaded) {
  const cards = new infra.FirestoreUserCardRepository(fb.db);
  const users = new infra.FirestoreUserRepository(fb.db);
  const audiences = new infra.FirestoreAudienceReader(fb.db);
  const clock = new infra.BrowserClock();
  const ids = new infra.BrowserIdGenerator();
  const catalog = { has: (id: string) => getCatalogCard(id) !== undefined };
  return {
    db: fb.db,
    ids,
    users,
    cards,
    audiences,
    listMyCards: new ListMyCards(cards),
    addUserCard: new AddUserCard(cards, catalog, ids, clock),
    removeUserCard: new RemoveUserCard(cards),
    setCardVisibility: new SetCardVisibility(cards, audiences),
  };
}

export type Container = ReturnType<typeof build>;

let cached: Promise<Container> | undefined;
export const getContainer = (): Promise<Container> => (cached ??= loadFirebase().then(build));
