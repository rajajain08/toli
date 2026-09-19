'use client';
import type { FirebaseApp } from 'firebase/app';

let started = false;

/**
 * Firebase Performance Monitoring: real-user LCP and TTI from the field (docs/architecture.md). Loaded
 * lazily after Firebase itself, never on the emulators, and never allowed to break a screen.
 */
export async function startPerformance(app: FirebaseApp): Promise<void> {
  if (started || typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === '1' || process.env.NODE_ENV !== 'production') return;
  started = true;
  try {
    const { getPerformance } = await import('firebase/performance');
    getPerformance(app);
  } catch {
    // unsupported browser or blocked script
  }
}
