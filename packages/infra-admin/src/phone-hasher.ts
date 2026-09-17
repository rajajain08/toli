import { createHmac } from 'node:crypto';
import type { PhoneHasher } from '@toli/application';

/** HMAC-SHA256 over the E.164 phone with a secret from Secret Manager. Deterministic so "is this person on Toli" can match. */
export class HmacPhoneHasher implements PhoneHasher {
  constructor(private readonly secret: string) {
    if (secret.length < 16) throw new Error('PHONE_HASH_SECRET must be at least 16 characters');
  }
  hash(phone: string): string {
    return createHmac('sha256', this.secret).update(phone).digest('hex');
  }
}
