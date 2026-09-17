'use client';
import { loadFirebase } from './firebase';

export type ProductEvent =
  | 'invite_opened'
  | 'otp_completed'
  | 'card_added'
  | 'group_joined'
  | 'visibility_changed'
  | 'find_used';

/** GA4 product events from docs/architecture.md. No-op without a measurement id or outside the browser. */
export async function track(name: ProductEvent, params: Record<string, string | number | boolean> = {}): Promise<void> {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return;
  try {
    const [{ fb }, { getAnalytics, isSupported, logEvent }] = await Promise.all([loadFirebase(), import('firebase/analytics')]);
    if (!(await isSupported())) return;
    logEvent(getAnalytics(fb.app), name, params);
  } catch {
    // analytics must never break a screen
  }
}
