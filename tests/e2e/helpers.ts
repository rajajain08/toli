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
 * A real touch swipe through Chrome's input pipeline (not a scripted scroll), so it fails if the element
 * cannot be dragged by a finger. Negative distance swipes left, towards the next item.
 */
export async function swipe(
  page: Page,
  locator: ReturnType<Page['locator']>,
  xDistance: number,
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('nothing to swipe');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    xDistance,
    yDistance: 0,
    gestureSourceType: 'touch',
    speed: 1200,
  });
  await cdp.detach();
}
