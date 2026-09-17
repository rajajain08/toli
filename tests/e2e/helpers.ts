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

export const freshPhone = (): { e164: string; national: string } => {
  const n = `9${String(Date.now()).slice(-9)}`;
  return { e164: `+91${n}`, national: n };
};
