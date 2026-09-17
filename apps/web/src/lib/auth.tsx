'use client';
import { UserId, type User } from '@toli/domain';
import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getContainer } from './container';
import { loadFirebase } from './firebase';

export type Profile = Pick<User, 'id' | 'name' | 'consentAt'>;

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

async function fetchProfile(uid: string): Promise<Profile | null> {
  const u = await (await getContainer()).users.get(UserId(uid));
  return u && u.name ? { id: u.id, name: u.name, consentAt: u.consentAt } : null;
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
        const profile = await fetchProfile(user.uid).catch(() => null);
        setState({ status: 'signedIn', user, profile });
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
    setState({ status: 'signedIn', user: state.user, profile });
    return profile;
  }, [state]);

  const signOut = useCallback(async () => {
    const { infra } = await loadFirebase();
    await (await infra.loadAuth()).signOut();
  }, []);

  const value = useMemo(() => ({ state, refreshProfile, signOut }), [state, refreshProfile, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
