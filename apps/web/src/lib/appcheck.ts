'use client';
import type { FirebaseApp } from 'firebase/app';

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

let started = false;

/**
 * App Check with reCAPTCHA Enterprise, required on every callable and on Firestore in dev and prod.
 * Skipped when no site key is configured (the emulators have no App Check service).
 */
export async function startAppCheck(app: FirebaseApp): Promise<void> {
  if (started || typeof window === 'undefined') return;
  const siteKey = process.env.NEXT_PUBLIC_APPCHECK_SITE_KEY;
  if (!siteKey) return;
  started = true;
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  if (debugToken) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
}
