import { CardId, GroupId, isRecentSignIn, parsePhone, UserCardId, UserId } from '@toli/domain';
import type { UserCardSnapshot } from '@toli/application';
import { Timestamp } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { buildCore, buildSignup, type Core } from './container';
import { toHttpsError } from './errors';

setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const phoneHashSecret = defineSecret('PHONE_HASH_SECRET');

/** App Check is enforced everywhere except the emulator, which has no App Check service. */
const isEmulator = process.env['FUNCTIONS_EMULATOR'] === 'true';
const enforceAppCheck = !isEmulator;
/** joinByInvite and createAudience sit on the critical path; they stay warm in prod only (it costs money). */
const criticalPath = {
  enforceAppCheck,
  minInstances: process.env['GCLOUD_PROJECT'] === 'toli-prod' ? 1 : 0,
};

let core: Core | undefined;
const c = () => (core ??= buildCore());
let signup: ReturnType<typeof buildSignup> | undefined;
const s = () => (signup ??= buildSignup({ phoneHashSecret: phoneHashSecret.value() }));

const requireUid = (request: CallableRequest<unknown>): UserId => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'sign in first');
  return UserId(request.auth.uid);
};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const body = (request: CallableRequest<unknown>): Record<string, unknown> =>
  request.data && typeof request.data === 'object' ? (request.data as Record<string, unknown>) : {};

/** Liveness check for the functions test tier and the client's emulator wiring. */
export const ping = onCall({ enforceAppCheck: false }, (request) => ({
  ok: true,
  at: new Date().toISOString(),
  uid: request.auth?.uid ?? null,
}));

/**
 * Called once after phone OTP. Reads the verified phone from the ID token, never from the client,
 * hashes it with the server secret and writes users/{uid}. The client cannot write phoneHash (rules).
 * The number itself and the separate marketing choice go to contacts/{uid}, which no client can read.
 */
export const completeSignup = onCall(
  { enforceAppCheck, secrets: [phoneHashSecret] },
  async (request) => {
    const uid = requireUid(request);
    const rawPhone = request.auth?.token['phone_number'];
    if (typeof rawPhone !== 'string')
      throw new HttpsError('failed-precondition', 'phone sign-in required');
    const data = body(request);
    try {
      const user = await s().completeSignup.execute({
        actor: uid,
        phone: parsePhone(rawPhone),
        name: str(data['name']),
        consent: data['consent'] === true,
        // Strictly opt-in: anything but a literal true is a no.
        marketingOptIn: data['marketingOptIn'] === true,
      });
      logger.info('completeSignup', { uid });
      return { ok: true, name: user.name, consentAt: user.consentAt.toISOString() };
    } catch (err) {
      throw toHttpsError(err, 'completeSignup');
    }
  },
);

/** Creates a group and its first invite in one round trip, so the next screen can share the link at once. */
export const createAudience = onCall(criticalPath, async (request) => {
  const uid = requireUid(request);
  try {
    const audience = await c().createAudience.execute({
      actor: uid,
      name: str(body(request)['name']),
    });
    const invite = await c().createInvite.execute({ actor: uid, audienceId: audience.id });
    logger.info('createAudience', { uid, audienceId: audience.id });
    return { audienceId: audience.id, name: audience.name ?? '', inviteCode: invite.code };
  } catch (err) {
    throw toHttpsError(err, 'createAudience');
  }
});

export const createInvite = onCall({ enforceAppCheck }, async (request) => {
  const uid = requireUid(request);
  try {
    const invite = await c().createInvite.execute({
      actor: uid,
      audienceId: GroupId(str(body(request)['audienceId']) || '-'),
    });
    logger.info('createInvite', { uid, audienceId: invite.audienceId });
    return { code: invite.code, expiresAt: invite.expiresAt.toISOString() };
  } catch (err) {
    throw toHttpsError(err, 'createInvite');
  }
});

export const joinByInvite = onCall(criticalPath, async (request) => {
  const uid = requireUid(request);
  try {
    const res = await c().joinByInvite.execute({ actor: uid, code: str(body(request)['code']) });
    logger.info('joinByInvite', {
      uid,
      audienceId: res.audience.id,
      alreadyMember: res.alreadyMember,
    });
    return {
      audienceId: res.audience.id,
      name: res.audience.name ?? '',
      alreadyMember: res.alreadyMember,
    };
  } catch (err) {
    throw toHttpsError(err, 'joinByInvite');
  }
});

/**
 * Opens (or finds) the 1:1 share between the caller and someone in one of their groups. It creates only the
 * two-member audience; which cards are visible in it stays the owner's own write, exactly as for a group.
 */
export const shareWith = onCall({ enforceAppCheck }, async (request) => {
  const uid = requireUid(request);
  try {
    const res = await c().shareWith.execute({
      actor: uid,
      target: UserId(str(body(request)['userId']) || '-'),
    });
    logger.info('shareWith', { uid, audienceId: res.audience.id, created: res.created });
    return { audienceId: res.audience.id, created: res.created };
  } catch (err) {
    throw toHttpsError(err, 'shareWith');
  }
});

/** The Settings screen's only window onto contacts/{uid}: the marketing choice and the last two digits. */
export const getMyAccount = onCall({ enforceAppCheck }, async (request) => {
  const uid = requireUid(request);
  try {
    return await c().getMyAccount.execute({ actor: uid });
  } catch (err) {
    throw toHttpsError(err, 'getMyAccount');
  }
});

/** Withdrawing marketing consent is one switch, effective at once. Only a literal boolean is accepted. */
export const setMarketingOptIn = onCall({ enforceAppCheck }, async (request) => {
  const uid = requireUid(request);
  const optIn = body(request)['optIn'];
  if (typeof optIn !== 'boolean')
    throw new HttpsError('invalid-argument', 'optIn must be true or false');
  try {
    const res = await c().setMarketingOptIn.execute({ actor: uid, optIn });
    logger.info('setMarketingOptIn', { uid, optIn: res.marketingOptIn });
    return res;
  } catch (err) {
    throw toHttpsError(err, 'setMarketingOptIn');
  }
});

/** Irreversible, so it asks for two things a stolen session is unlikely to have: the typed word, and a sign-in in the last ten minutes. */
export const deleteAccount = onCall({ enforceAppCheck, timeoutSeconds: 120 }, async (request) => {
  const uid = requireUid(request);
  if (body(request)['confirm'] !== 'DELETE')
    throw new HttpsError('invalid-argument', 'confirmation missing');
  if (!isRecentSignIn(request.auth?.token['auth_time'], new Date()))
    throw new HttpsError('failed-precondition', 'sign in again to delete your account', {
      code: 'recent-sign-in-required',
    });
  try {
    const res = await c().deleteAccount.execute({ actor: uid });
    logger.info('deleteAccount', { uid, ...res });
    return { ok: true, ...res };
  } catch (err) {
    throw toHttpsError(err, 'deleteAccount');
  }
});

const snapshotOf = (
  data: FirebaseFirestore.DocumentData | undefined,
): UserCardSnapshot | undefined =>
  data && typeof data['cardId'] === 'string'
    ? {
        cardId: CardId(data['cardId']),
        visibleTo: (Array.isArray(data['visibleTo']) ? data['visibleTo'] : [])
          .filter((x): x is string => typeof x === 'string' && x.length > 0)
          .slice(0, 50)
          .map((x) => GroupId(x)),
        addedAt: data['addedAt'] instanceof Timestamp ? data['addedAt'].toDate() : new Date(),
      }
    : undefined;

/** Write side to read side: the owner writes users/{uid}/cards/{ucId} once, this fans it out. */
export const onUserCardWritten = onDocumentWritten('users/{uid}/cards/{ucId}', async (event) => {
  const { uid, ucId } = event.params;
  const res = await c().projectUserCard.execute({
    ownerId: UserId(uid),
    userCardId: UserCardId(ucId),
    before: snapshotOf(event.data?.before.data()),
    after: snapshotOf(event.data?.after.data()),
  });
  logger.info('projectUserCard', {
    uid,
    ucId,
    projected: res.projected.length,
    removed: res.removed.length,
    refused: res.refused.length,
  });
});
