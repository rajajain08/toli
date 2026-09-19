import { randomInt } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';

const AUTH = 'http://127.0.0.1:9099';
const PROJECT = 'demo-toli';

/** The Auth emulator exposes the OTPs it would have sent by SMS. */
export async function latestOtp(request: APIRequestContext, phone: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await request.get(`${AUTH}/emulator/v1/projects/${PROJECT}/verificationCodes`);
    const body = (await res.json()) as {
      verificationCodes?: { code: string; phoneNumber: string }[];
    };
    const match = (body.verificationCodes ?? []).filter((c) => c.phoneNumber === phone).at(-1);
    if (match) return match.code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no OTP recorded for ${phone}`);
}

export async function clearAuthEmulator(request: APIRequestContext): Promise<void> {
  await request.delete(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`);
}

/** Random, not clock-based: parallel workers start in the same millisecond and would share a number (and each other's OTP). */
export const freshPhone = (): { e164: string; national: string } => {
  const n = `9${String(randomInt(0, 1_000_000_000)).padStart(9, '0')}`;
  return { e164: `+91${n}`, national: n };
};

import type { Page } from '@playwright/test';

/** Signs a fresh phone up through the real screens and returns after the profile step. */
export async function signUp(
  page: Page,
  request: APIRequestContext,
  name = 'Raja',
): Promise<{ e164: string }> {
  await page.goto('/auth');
  return completeSignUp(page, request, name);
}

/** Same, from wherever the sign-in screen already is (for example after "Sign in to join"). */
export async function completeSignUp(
  page: Page,
  request: APIRequestContext,
  name: string,
): Promise<{ e164: string }> {
  const phone = freshPhone();
  await page.getByLabel('Your phone number').fill(phone.national);
  await page.getByRole('button', { name: 'Get code by SMS' }).click();
  // Read the OTP only once the code step is on screen, so the emulator has settled the session.
  await page.getByRole('heading', { name: 'Enter the code' }).waitFor();
  await page.getByLabel('Code').fill(await latestOtp(request, phone.e164));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel(/I agree that Toli stores my name/).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  return phone;
}

/**
 * A real finger drag through Chrome's input pipeline: touch start, stepped moves, touch end. Not a scripted
 * scroll, so it fails if the element cannot be dragged. Stepped rather than one synthetic fling, because
 * fling physics differ between platforms and CI must see the same gesture a laptop does.
 * Negative distance drags left, towards the next item.
 */
export async function swipe(
  page: Page,
  locator: ReturnType<Page['locator']>,
  xDistance: number,
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('nothing to swipe');
  const y = box.y + box.height / 2;
  const startX = xDistance < 0 ? box.x + box.width - 40 : box.x + 40;
  const cdp = await page.context().newCDPSession(page);
  const steps = 12;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: startX, y }],
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: startX + (xDistance * i) / steps, y }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-toli/databases/(default)/documents';
/** The emulators treat "Bearer owner" as an admin: rules are bypassed, exactly like the Admin SDK. */
const ADMIN = { Authorization: 'Bearer owner' };

export async function uidForPhone(request: APIRequestContext, e164: string): Promise<string> {
  const res = await request.get(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=1000`,
    { headers: ADMIN },
  );
  const body = (await res.json()) as { users?: { localId: string; phoneNumber?: string }[] };
  const user = (body.users ?? []).find((u) => u.phoneNumber === e164);
  if (!user) throw new Error(`no auth user for ${e164}`);
  return user.localId;
}

/**
 * Turns a fresh account into one from before ADR-0013: no consentVersion on the profile and no contact
 * record, which is what accounts created under the first consent text look like.
 */
export async function makeLegacyAccount(request: APIRequestContext, uid: string): Promise<void> {
  const patched = await request.patch(
    `${FIRESTORE}/users/${uid}?updateMask.fieldPaths=consentVersion`,
    { headers: ADMIN, data: { fields: {} } },
  );
  if (!patched.ok()) throw new Error(`could not strip consentVersion: ${patched.status()}`);
  await request.delete(`${FIRESTORE}/contacts/${uid}`, { headers: ADMIN });
}

export async function contactExists(request: APIRequestContext, uid: string): Promise<boolean> {
  return (await request.get(`${FIRESTORE}/contacts/${uid}`, { headers: ADMIN })).ok();
}

export async function docExists(request: APIRequestContext, path: string): Promise<boolean> {
  return (await request.get(`${FIRESTORE}/${path}`, { headers: ADMIN })).ok();
}
