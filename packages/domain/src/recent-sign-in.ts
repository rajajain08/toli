/**
 * Irreversible actions (deleting an account) need a sign-in from the last ten minutes, so a session left
 * open on a borrowed phone is not enough. `authTimeSeconds` is the ID token's auth_time claim.
 */
export const RECENT_SIGN_IN_SECONDS = 10 * 60;

export const isRecentSignIn = (authTimeSeconds: unknown, now: Date): boolean => {
  if (
    typeof authTimeSeconds !== 'number' ||
    !Number.isFinite(authTimeSeconds) ||
    authTimeSeconds <= 0
  )
    return false;
  const age = now.getTime() / 1000 - authTimeSeconds;
  // A token from the future is not proof of anything; allow a minute of clock skew.
  return age >= -60 && age <= RECENT_SIGN_IN_SECONDS;
};
