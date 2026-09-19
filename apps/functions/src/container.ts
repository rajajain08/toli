import { CompleteSignup } from '@toli/application';
import {
  AdminContactRepository,
  AdminUserRepository,
  CryptoIdGenerator,
  getAdminDb,
  HmacPhoneHasher,
  SystemClock,
} from '@toli/infra-admin';

/** Composition root for Cloud Functions: the only place adapters meet use cases. */
export function buildContainer(secrets: { phoneHashSecret: string }) {
  const db = getAdminDb();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const users = new AdminUserRepository(db);
  const contacts = new AdminContactRepository(db);
  const hasher = new HmacPhoneHasher(secrets.phoneHashSecret);
  return {
    db,
    clock,
    ids,
    users,
    contacts,
    completeSignup: new CompleteSignup(users, contacts, hasher, clock),
  };
}

export type Container = ReturnType<typeof buildContainer>;
