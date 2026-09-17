import { deleteApp, initializeApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { afterAll, describe, expect, it } from 'vitest';

const app = initializeApp(
  { projectId: 'demo-toli', apiKey: 'demo', appId: 'demo' },
  'functions-test',
);
const fns = getFunctions(app, 'asia-south1');
connectFunctionsEmulator(fns, '127.0.0.1', 5001);

afterAll(async () => {
  await deleteApp(app);
});

describe('ping', () => {
  it('answers from the emulator with a timestamp and no uid when unauthenticated', async () => {
    const res = await httpsCallable<unknown, { ok: boolean; at: string; uid: string | null }>(
      fns,
      'ping',
    )({});
    expect(res.data.ok).toBe(true);
    expect(Number.isNaN(Date.parse(res.data.at))).toBe(false);
    expect(res.data.uid).toBeNull();
  });
});
