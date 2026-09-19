import { createHmac } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type FunctionsError,
} from 'firebase/functions';
import { getApps as adminApps, initializeApp as adminInit } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PROJECT = 'demo-toli';
const PHONE = '+919876543210';
const SECRET = 'local-dev-secret-change-me'; // apps/functions/.secret.local
const expectedHash = createHmac('sha256', SECRET).update(PHONE).digest('hex');

const admin = adminApps()[0] ?? adminInit({ projectId: PROJECT });
const app = initializeApp(
  { projectId: PROJECT, apiKey: 'demo', appId: 'demo', authDomain: `${PROJECT}.firebaseapp.com` },
  'signup-test',
);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const fns = getFunctions(app, 'asia-south1');
connectFunctionsEmulator(fns, '127.0.0.1', 5001);

type Input = { name?: string; consent?: boolean; marketingOptIn?: boolean };
type Output = { ok: true; name: string; consentAt: string };
const completeSignup = httpsCallable<Input, Output>(fns, 'completeSignup');
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: FunctionsError) => e.code,
  );

const uid = `signup-${Date.now()}`;

beforeAll(async () => {
  await adminAuth(admin).createUser({ uid, phoneNumber: PHONE });
  const token = await adminAuth(admin).createCustomToken(uid);
  await signInWithCustomToken(auth, token);
});

afterAll(async () => {
  await signOut(auth);
  await adminAuth(admin)
    .deleteUser(uid)
    .catch(() => {});
  await adminFirestore(admin)
    .doc(`users/${uid}`)
    .delete()
    .catch(() => {});
  await deleteApp(app);
});

describe('completeSignup', () => {
  it('refuses without consent and without a name', async () => {
    expect(await codeOf(completeSignup({ name: 'Raja', consent: false }))).toBe(
      'functions/invalid-argument',
    );
    expect(await codeOf(completeSignup({ name: '   ', consent: true }))).toBe(
      'functions/invalid-argument',
    );
    expect((await adminFirestore(admin).doc(`users/${uid}`).get()).exists).toBe(false);
    expect((await adminFirestore(admin).doc(`contacts/${uid}`).get()).exists).toBe(false);
  });

  it('writes users/{uid} with the HMAC of the verified phone and never the phone itself', async () => {
    const res = await completeSignup({ name: '  Raja  Jain ', consent: true });
    expect(res.data.ok).toBe(true);
    expect(res.data.name).toBe('Raja Jain');

    const snap = await adminFirestore(admin).doc(`users/${uid}`).get();
    const data = snap.data()!;
    expect(data['name']).toBe('Raja Jain');
    expect(data['phoneHash']).toBe(expectedHash);
    expect(data['consentAt']).toBeTruthy();
    expect(data['createdAt']).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain('9876543210');
    expect(Object.keys(data).sort()).toEqual([
      'consentAt',
      'consentVersion',
      'createdAt',
      'name',
      'phoneHash',
    ]);
    expect(data['consentVersion']).toBe(2);
  });

  it('keeps the verified phone in contacts/{uid}, opted out unless the box was ticked', async () => {
    const contact = (await adminFirestore(admin).doc(`contacts/${uid}`).get()).data()!;
    expect(contact['phone']).toBe(PHONE);
    expect(contact['marketingOptIn']).toBe(false);
    expect(contact['marketingOptInAt']).toBeUndefined();

    await completeSignup({ name: 'Raja Jain', consent: true, marketingOptIn: true });
    const optedIn = (await adminFirestore(admin).doc(`contacts/${uid}`).get()).data()!;
    expect(optedIn['marketingOptIn']).toBe(true);
    expect(optedIn['marketingOptInAt']).toBeTruthy();

    // A truthy non-boolean is not consent.
    await completeSignup({
      name: 'Raja Jain',
      consent: true,
      marketingOptIn: 'yes' as unknown as boolean,
    });
    expect(
      (await adminFirestore(admin).doc(`contacts/${uid}`).get()).data()!['marketingOptIn'],
    ).toBe(false);
  });

  it('is idempotent on redelivery: keeps consentAt, refreshes the name', async () => {
    const before = (await adminFirestore(admin).doc(`users/${uid}`).get()).data()!;
    const res = await completeSignup({ name: 'Raja J', consent: true });
    const after = (await adminFirestore(admin).doc(`users/${uid}`).get()).data()!;
    expect(res.data.name).toBe('Raja J');
    expect(after['consentAt']).toEqual(before['consentAt']);
    expect(after['createdAt']).toEqual(before['createdAt']);
  });
});

describe('account settings', () => {
  type Account = {
    name: string;
    phoneMasked?: string;
    marketingOptIn: boolean;
    needsConsent: boolean;
  };
  const getMyAccount = httpsCallable<unknown, Account>(fns, 'getMyAccount');
  const setMarketingOptIn = httpsCallable<{ optIn: unknown }, { marketingOptIn: boolean }>(
    fns,
    'setMarketingOptIn',
  );

  it('shows the marketing choice and only the last two digits of the phone', async () => {
    await completeSignup({ name: 'Raja Jain', consent: true, marketingOptIn: true });
    const { data } = await getMyAccount({});
    expect(data).toEqual({
      name: 'Raja Jain',
      phoneMasked: '••••• •••10',
      marketingOptIn: true,
      needsConsent: false,
    });
    expect(JSON.stringify(data)).not.toContain('98765432');
  });

  it('withdraws and gives marketing consent with one call, and accepts only a boolean', async () => {
    expect((await setMarketingOptIn({ optIn: false })).data).toEqual({ marketingOptIn: false });
    const off = (await adminFirestore(admin).doc(`contacts/${uid}`).get()).data()!;
    expect(off['marketingOptIn']).toBe(false);
    expect(off['marketingOptInAt']).toBeUndefined();
    expect(off['phone']).toBe(PHONE);
    expect(await codeOf(setMarketingOptIn({ optIn: 'yes' }))).toBe('functions/invalid-argument');
    expect((await setMarketingOptIn({ optIn: true })).data).toEqual({ marketingOptIn: true });
  });

  it('an account from before ADR-0013 is flagged, cannot opt in without a contact record, and re-consenting fixes both', async () => {
    await adminFirestore(admin).doc(`users/${uid}`).update({ consentVersion: FieldValue.delete() });
    await adminFirestore(admin).doc(`contacts/${uid}`).delete();
    expect((await getMyAccount({})).data).toMatchObject({
      needsConsent: true,
      marketingOptIn: false,
    });
    expect(await codeOf(setMarketingOptIn({ optIn: true }))).toBe('functions/not-found');

    const before = (await adminFirestore(admin).doc(`users/${uid}`).get()).data()!;
    await completeSignup({ name: 'Raja Jain', consent: true, marketingOptIn: false });
    const after = (await adminFirestore(admin).doc(`users/${uid}`).get()).data()!;
    expect(after['consentVersion']).toBe(2);
    expect(after['consentAt'].toMillis()).toBeGreaterThanOrEqual(before['consentAt'].toMillis());
    expect(after['createdAt']).toEqual(before['createdAt']);
    expect((await adminFirestore(admin).doc(`contacts/${uid}`).get()).data()!['phone']).toBe(PHONE);
    expect((await getMyAccount({})).data.needsConsent).toBe(false);
  });
});

describe('completeSignup without a session', () => {
  it('is unauthenticated', async () => {
    const anon = initializeApp({ projectId: PROJECT, apiKey: 'demo', appId: 'demo' }, 'anon-test');
    const anonFns = getFunctions(anon, 'asia-south1');
    connectFunctionsEmulator(anonFns, '127.0.0.1', 5001);
    expect(
      await codeOf(httpsCallable(anonFns, 'completeSignup')({ name: 'x', consent: true })),
    ).toBe('functions/unauthenticated');
    await deleteApp(anon);
  });
});
