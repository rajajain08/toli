import type { Clock, IdGenerator } from '@toli/application';

export class BrowserClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Web Crypto based ids. 20 characters, the same shape as a Firestore auto id. */
export class BrowserIdGenerator implements IdGenerator {
  newId(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return this.randomIndices(20, alphabet.length)
      .map((i) => alphabet[i])
      .join('');
  }
  randomIndices(count: number, bound: number): number[] {
    // Rejection sampling keeps the distribution uniform for any bound up to 256.
    const out: number[] = [];
    const limit = 256 - (256 % bound);
    while (out.length < count) {
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(count * 2));
      for (const b of bytes) if (b < limit && out.length < count) out.push(b % bound);
    }
    return out;
  }
}
