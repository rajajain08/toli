import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface EmulatorHosts {
  host: string;
  firestorePort: number;
  authPort: number;
  functionsPort: number;
}

export interface ToliFirebase {
  app: FirebaseApp;
  db: Firestore;
  emulators: EmulatorHosts | undefined;
}

let instance: ToliFirebase | undefined;

/**
 * One Firebase app per page. Firestore uses the persistent multi-tab cache so a second launch renders
 * from IndexedDB before the network answers; `cache: 'memory'` is for tests and non-browser contexts.
 */
export function initFirebase(
  options: FirebaseOptions,
  config: {
    emulators?: EmulatorHosts | undefined;
    cache?: 'persistent' | 'memory' | undefined;
  } = {},
): ToliFirebase {
  if (instance) return instance;
  const app = getApps()[0] ?? initializeApp(options);
  const db = initializeFirestore(app, {
    localCache:
      config.cache === 'memory'
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (config.emulators)
    connectFirestoreEmulator(db, config.emulators.host, config.emulators.firestorePort);
  instance = { app, db, emulators: config.emulators };
  return instance;
}

export function getFirebase(): ToliFirebase {
  if (!instance) throw new Error('initFirebase() has not been called');
  return instance;
}

/** Auth and reCAPTCHA are only needed on the OTP route, so they load lazily. */
export async function loadAuth() {
  const { app, emulators } = getFirebase();
  const { getAuth, connectAuthEmulator } = await import('firebase/auth');
  const auth = getAuth(app);
  if (emulators && !('emulatorConfig' in auth && auth.emulatorConfig))
    connectAuthEmulator(auth, `http://${emulators.host}:${emulators.authPort}`, {
      disableWarnings: true,
    });
  return auth;
}

export async function loadFunctions(region = 'asia-south1') {
  const { app, emulators } = getFirebase();
  const { getFunctions, connectFunctionsEmulator, httpsCallable } =
    await import('firebase/functions');
  const fns = getFunctions(app, region);
  if (emulators) connectFunctionsEmulator(fns, emulators.host, emulators.functionsPort);
  return { fns, httpsCallable };
}
