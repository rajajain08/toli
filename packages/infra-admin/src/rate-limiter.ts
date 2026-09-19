import type { Clock, RateLimiter } from '@toli/application';
import type { Firestore } from 'firebase-admin/firestore';
import { adminPaths } from './paths';

/** Per-key sliding window in ratelimits/{key}. One small transaction per attempt; server-only collection. */
export class FirestoreRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Firestore,
    private readonly clock: Clock,
    private readonly config: { windowMs: number; max: number } = {
      windowMs: 60 * 60 * 1000,
      max: 10,
    },
  ) {}

  async attempt(key: string, action: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const ref = this.db.doc(adminPaths.ratelimit(key));
    const field = `${action}Attempts`;
    return this.db.runTransaction(async (tx) => {
      const now = this.clock.now().getTime();
      const snap = await tx.get(ref);
      const raw: unknown = snap.data()?.[field];
      const recent = (Array.isArray(raw) ? raw : [])
        .filter((t): t is number => typeof t === 'number' && t > now - this.config.windowMs)
        .sort((a, b) => a - b);
      if (recent.length >= this.config.max) {
        const oldest = recent[0] ?? now;
        return {
          allowed: false,
          retryAfterMs: Math.max(1000, oldest + this.config.windowMs - now),
        };
      }
      tx.set(ref, { [field]: [...recent, now] }, { merge: true });
      return { allowed: true, retryAfterMs: 0 };
    });
  }
}
