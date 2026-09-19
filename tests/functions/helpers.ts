import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
  type FunctionsError,
} from 'firebase/functions';
import { getApps as adminApps, initializeApp as adminInit } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore, Timestamp } from 'firebase-admin/firestore';

export const PROJECT = 'demo-toli';
export const admin = adminApps()[0] ?? adminInit({ projectId: PROJECT });
export const db = adminFirestore(admin);

export interface TestUser {
  uid: string;
  app: FirebaseApp;
  fns: Functions;
  call: <I, O>(name: string, data: I) => Promise<O>;
}

let seq = 0;

/** A signed-in person with a profile, created straight through the Admin SDK so tests stay fast. */
export async function person(name: string): Promise<TestUser> {
  const uid = `${name.toLowerCase()}-${Date.now()}-${seq++}`;
  await adminAuth(admin).createUser({ uid });
  await db
    .doc(`users/${uid}`)
    .set({
      name,
      phoneHash: 'h'.repeat(64),
      consentAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  const app = initializeApp(
    { projectId: PROJECT, apiKey: 'demo', appId: 'demo', authDomain: `${PROJECT}.firebaseapp.com` },
    uid,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await signInWithCustomToken(auth, await adminAuth(admin).createCustomToken(uid));
  const fns = getFunctions(app, 'asia-south1');
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  return {
    uid,
    app,
    fns,
    call: async (fn, data) => (await httpsCallable(fns, fn)(data)).data as never,
  };
}

export const dispose = async (...users: TestUser[]) => {
  for (const u of users) await deleteApp(u.app).catch(() => {});
};

export const codeOf = (p: Promise<unknown>): Promise<string> =>
  p.then(
    () => 'ok',
    (e: FunctionsError) => e.code,
  );

/** Triggers are asynchronous; poll until the read side catches up. */
export async function eventually<T>(
  read: () => Promise<T>,
  ok: (v: T) => boolean,
  ms = 15_000,
): Promise<T> {
  const end = Date.now() + ms;
  let last = await read();
  while (!ok(last) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 200));
    last = await read();
  }
  return last;
}
