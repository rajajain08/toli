'use client';
import { needsConsent, UserId, type User } from '@toli/domain';
import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getContainer } from './container';
import { loadFirebase } from './firebase';

export type Profile = Pick<User, 'id' | 'name' | 'consentAt' | 'consentVersion'>;

/** Signed in, has a profile, and has agreed to the current consent text. Everything behind auth needs all three. */
export const isReady = (state: AuthState): boolean =>
  state.status === 'signedIn' && state.profile !== null && !needsConsent(state.profile);

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: FirebaseUser; profile: Profile | null };

interface AuthContextValue {
  state: AuthState;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * A tiny snapshot of the profile, per uid, so the gate opens at once on a return visit instead of waiting
 * on Firestore (after a reload the new page can wait seconds for the old page's IndexedDB lease). It only
 * decides what to draw; rules and the functions enforce everything, and the real profile replaces it as
 * soon as it arrives.
 */
const cacheKey = (uid: string) => `toli:profile:${uid}`;
function readCachedProfile(uid: string): Profile | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const v = JSON.parse(raw) as { name?: unknown; consentAt?: unknown; consentVersion?: unknown };
    if (typeof v.name !== 'string' || typeof v.consentVersion !== 'number') return null;
    return { id: UserId(uid), name: v.name, consentAt: new Date(typeof v.consentAt === 'string' ? v.consentAt : 0), consentVersion: v.consentVersion };
  } catch {
    return null;
  }
}
function writeCachedProfile(uid: string, profile: Profile | null): void {
  try {
    if (!profile) window.localStorage.removeItem(cacheKey(uid));
    else window.localStorage.setItem(cacheKey(uid), JSON.stringify({ name: profile.name, consentAt: profile.consentAt.toISOString(), consentVersion: profile.consentVersion }));
  } catch {
    // private mode or a full disk: the app works without the snapshot, just a little slower
  }
}

async function fetchProfile(uid: string): Promise<Profile | null> {
  const u = await (await getContainer()).users.get(UserId(uid));
  return u && u.name ? { id: u.id, name: u.name, consentAt: u.consentAt, consentVersion: u.consentVersion } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    void loadFirebase()
      .then(({ infra }) => infra.loadAuth())
      .then((auth) => {
      if (cancelled) return;
      unsub = auth.onAuthStateChanged(async (user) => {
        if (!user) return setState({ status: 'signedOut' });
        // Draw from the snapshot now; correct it from Firestore when that answers.
        const cached = readCachedProfile(user.uid);
        if (cached) setState({ status: 'signedIn', user, profile: cached });
        try {
          const profile = await fetchProfile(user.uid);
          writeCachedProfile(user.uid, profile);
          setState({ status: 'signedIn', user, profile });
        } catch {
          // Offline or a slow start: keep what we have. With no snapshot either, fall through to sign-up.
          if (!cached) setState({ status: 'signedIn', user, profile: null });
        }
      });
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (state.status !== 'signedIn') return null;
    const profile = await fetchProfile(state.user.uid);
    writeCachedProfile(state.user.uid, profile);
    setState({ status: 'signedIn', user: state.user, profile });
    return profile;
  }, [state]);

  const signOut = useCallback(async () => {
    const { infra } = await loadFirebase();
    const auth = await infra.loadAuth();
    if (auth.currentUser) writeCachedProfile(auth.currentUser.uid, null);
    await auth.signOut();
  }, []);

  const value = useMemo(() => ({ state, refreshProfile, signOut }), [state, refreshProfile, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
