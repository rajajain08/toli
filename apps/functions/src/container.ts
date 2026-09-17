import { AdminUserRepository, CryptoIdGenerator, getAdminDb, SystemClock } from '@toli/infra-admin';

/** Composition root for Cloud Functions: the only place adapters meet use cases. */
export function buildContainer() {
  const db = getAdminDb();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const users = new AdminUserRepository(db);
  return { db, clock, ids, users };
}

export type Container = ReturnType<typeof buildContainer>;
