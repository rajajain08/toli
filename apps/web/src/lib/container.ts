'use client';
import { ListMyCards } from '@toli/application';
import { loadFirebase, type Loaded } from './firebase';

/** Composition root for the web app: the only place adapters meet use cases. Async because Firebase is lazy. */
function build({ infra, fb }: Loaded) {
  const cards = new infra.FirestoreUserCardRepository(fb.db);
  const users = new infra.FirestoreUserRepository(fb.db);
  return {
    db: fb.db,
    users,
    cards,
    listMyCards: new ListMyCards(cards),
  };
}

export type Container = ReturnType<typeof build>;

let cached: Promise<Container> | undefined;
export const getContainer = (): Promise<Container> => (cached ??= loadFirebase().then(build));
