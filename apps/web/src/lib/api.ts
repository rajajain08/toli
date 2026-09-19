'use client';
import { loadFirebase } from './firebase';

/** Typed wrappers over the callables. The only place the web app names a function. */
export async function callCompleteSignup(input: { name: string; consent: boolean; marketingOptIn: boolean }) {
  const { infra } = await loadFirebase();
  const { fns, httpsCallable } = await infra.loadFunctions();
  const fn = httpsCallable<typeof input, { ok: true; name: string; consentAt: string }>(fns, 'completeSignup');
  return (await fn(input)).data;
}
