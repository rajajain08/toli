import { parsePhone, UserId } from '@toli/domain';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { buildContainer, type Container } from './container';
import { toHttpsError } from './errors';

setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const phoneHashSecret = defineSecret('PHONE_HASH_SECRET');

/** App Check is enforced everywhere except the emulator, which has no App Check service. */
const isEmulator = process.env['FUNCTIONS_EMULATOR'] === 'true';
const guarded = { enforceAppCheck: !isEmulator, secrets: [phoneHashSecret] };

let container: Container | undefined;
const c = () => (container ??= buildContainer({ phoneHashSecret: phoneHashSecret.value() }));

/** Liveness check for the functions test tier and the client's emulator wiring. */
export const ping = onCall({ enforceAppCheck: false }, (request) => ({
  ok: true,
  at: new Date().toISOString(),
  uid: request.auth?.uid ?? null,
}));

/**
 * Called once after phone OTP. Reads the verified phone from the ID token, never from the client,
 * hashes it with the server secret and writes users/{uid}. The client cannot write phoneHash (rules).
 */
export const completeSignup = onCall(guarded, async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'sign in first');
  const rawPhone = auth.token['phone_number'];
  if (typeof rawPhone !== 'string')
    throw new HttpsError('failed-precondition', 'phone sign-in required');
  const body = (request.data ?? {}) as { name?: unknown; consent?: unknown };
  try {
    const user = await c().completeSignup.execute({
      actor: UserId(auth.uid),
      phone: parsePhone(rawPhone),
      name: typeof body.name === 'string' ? body.name : '',
      consent: body.consent === true,
    });
    logger.info('completeSignup', { uid: auth.uid });
    return { ok: true, name: user.name, consentAt: user.consentAt.toISOString() };
  } catch (err) {
    throw toHttpsError(err, 'completeSignup');
  }
});
