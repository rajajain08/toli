'use client';
import { loadFirebase } from './firebase';

/** Typed wrappers over the callables. The only place the web app names a function. */
async function call<I, O>(name: string, input: I): Promise<O> {
  const { infra } = await loadFirebase();
  const { fns, httpsCallable } = await infra.loadFunctions();
  return (await httpsCallable<I, O>(fns, name)(input)).data;
}

export const callCompleteSignup = (input: { name: string; consent: boolean; marketingOptIn: boolean }) =>
  call<typeof input, { ok: true; name: string; consentAt: string }>('completeSignup', input);

export const callCreateAudience = (input: { name: string }) =>
  call<typeof input, { audienceId: string; name: string; inviteCode: string }>('createAudience', input);

export const callCreateInvite = (input: { audienceId: string }) =>
  call<typeof input, { code: string; expiresAt: string }>('createInvite', input);

export const callJoinByInvite = (input: { code: string }) =>
  call<typeof input, { audienceId: string; name: string; alreadyMember: boolean }>('joinByInvite', input);

export const callShareWith = (input: { userId: string }) =>
  call<typeof input, { audienceId: string; created: boolean }>('shareWith', input);

export interface MyAccount {
  name: string;
  phoneMasked?: string;
  marketingOptIn: boolean;
  needsConsent: boolean;
}
export const callGetMyAccount = () => call<Record<string, never>, MyAccount>('getMyAccount', {});

export const callSetMarketingOptIn = (input: { optIn: boolean }) =>
  call<typeof input, { marketingOptIn: boolean }>('setMarketingOptIn', input);

/** The server also checks for a sign-in in the last ten minutes. */
export const callDeleteAccount = () =>
  call<{ confirm: 'DELETE' }, { ok: true; cardsRemoved: number }>('deleteAccount', { confirm: 'DELETE' });

/** Callable errors carry a Firebase code like "functions/resource-exhausted"; turn them into one plain line. */
export const callableMessage = (err: unknown): string => {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
  const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
  if (code.includes('resource-exhausted')) return 'Too many tries. Wait a while and try again.';
  if (code.includes('invalid-argument') || code.includes('failed-precondition') || code.includes('not-found'))
    return message ? message.charAt(0).toUpperCase() + message.slice(1) + '.' : 'That did not work. Check and try again.';
  if (code.includes('permission-denied')) return 'You are not in this group.';
  if (code.includes('unauthenticated')) return 'Sign in first.';
  return 'Something went wrong. Try again.';
};
