import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;

/** Admin SDK singleton. Credentials come from the runtime (Cloud Functions) or the emulator env. */
export function getAdminApp(): App {
  if (!app) app = getApps()[0] ?? initializeApp();
  return app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
