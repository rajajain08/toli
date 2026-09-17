import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { buildContainer } from './container';

setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

let container: ReturnType<typeof buildContainer> | undefined;
const c = () => (container ??= buildContainer());

/** Liveness check for the functions test tier and the client's emulator wiring. */
export const ping = onCall({ enforceAppCheck: false }, (request) => {
  const now = c().clock.now();
  return { ok: true, at: now.toISOString(), uid: request.auth?.uid ?? null };
});
