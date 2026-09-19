'use client';
import type { ToliFirebase } from '@toli/infra-client';
import { startAppCheck } from './appcheck';
import { startPerformance } from './perf';

/**
 * The only door to Firebase from the web app. Everything Firebase is behind one dynamic import so the
 * app shell paints from React alone and the SDK arrives right after hydration (180 KB initial budget).
 */
export type Infra = typeof import('@toli/infra-client');
export interface Loaded {
  infra: Infra;
  fb: ToliFirebase;
}

// Next inlines NEXT_PUBLIC_* only on static property access, so every variable is named literally here.
const PUBLIC = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
  useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS ?? '',
  emulatorHost: process.env.NEXT_PUBLIC_EMULATOR_HOST ?? '',
} as const;

export const EMULATOR_PORTS = { firestore: 8080, auth: 9099, functions: 5001 } as const;

export const usingEmulators = (): boolean => PUBLIC.useEmulators === '1';

let loading: Promise<Loaded> | undefined;

export function loadFirebase(): Promise<Loaded> {
  return (loading ??= (async () => {
    const useEmulators = usingEmulators();
    const infra = await import('@toli/infra-client');
    infra.assertNotLocalProd({
      projectId: PUBLIC.projectId,
      useEmulators,
      hostname: typeof window === 'undefined' ? undefined : window.location.hostname,
    });
    const fb = infra.initFirebase(
      {
        apiKey: PUBLIC.apiKey,
        authDomain: PUBLIC.authDomain,
        projectId: PUBLIC.projectId,
        appId: PUBLIC.appId,
        ...(PUBLIC.measurementId ? { measurementId: PUBLIC.measurementId } : {}),
      },
      {
        emulators: useEmulators
          ? {
              host: PUBLIC.emulatorHost || '127.0.0.1',
              firestorePort: EMULATOR_PORTS.firestore,
              authPort: EMULATOR_PORTS.auth,
              functionsPort: EMULATOR_PORTS.functions,
            }
          : undefined,
        cache: typeof window === 'undefined' ? 'memory' : 'persistent',
      },
    );
    void startAppCheck(fb.app);
    void startPerformance(fb.app);
    return { infra, fb };
  })());
}
