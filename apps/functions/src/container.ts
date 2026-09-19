import {
  CompleteSignup,
  CreateAudience,
  CreateInvite,
  GetInvitePreview,
  JoinByInvite,
  ProjectUserCard,
  type CardCatalogReader,
} from '@toli/application';
import { getCatalogCard } from '@toli/catalog';
import {
  AdminAudienceRepository,
  AdminContactRepository,
  AdminGroupCardReadModel,
  AdminInviteRepository,
  AdminUserRepository,
  CryptoIdGenerator,
  FirestoreRateLimiter,
  getAdminDb,
  HmacPhoneHasher,
  SystemClock,
} from '@toli/infra-admin';

const catalog: CardCatalogReader = { get: (id) => getCatalogCard(id) };

/**
 * Composition root for Cloud Functions: the only place adapters meet use cases. Split in two because
 * only sign-up needs the phone-hash secret; triggers and the other callables must not bind it.
 */
export function buildCore() {
  const db = getAdminDb();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();
  const users = new AdminUserRepository(db);
  const audiences = new AdminAudienceRepository(db);
  const invites = new AdminInviteRepository(db);
  const readModel = new AdminGroupCardReadModel(db);
  const limiter = new FirestoreRateLimiter(db, clock);
  return {
    db,
    clock,
    ids,
    users,
    audiences,
    invites,
    readModel,
    createAudience: new CreateAudience(audiences, users, ids, clock),
    createInvite: new CreateInvite(audiences, invites, ids, clock),
    joinByInvite: new JoinByInvite(audiences, invites, users, limiter, clock),
    getInvitePreview: new GetInvitePreview(invites, audiences, users, clock),
    projectUserCard: new ProjectUserCard(readModel, audiences, users, catalog),
  };
}

export function buildSignup(secrets: { phoneHashSecret: string }) {
  const db = getAdminDb();
  return {
    completeSignup: new CompleteSignup(
      new AdminUserRepository(db),
      new AdminContactRepository(db),
      new HmacPhoneHasher(secrets.phoneHashSecret),
      new SystemClock(),
    ),
  };
}

export type Core = ReturnType<typeof buildCore>;
