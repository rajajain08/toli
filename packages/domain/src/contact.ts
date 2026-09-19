import type { UserId } from './ids';
import type { PhoneNumber } from './phone';

/**
 * A person's verified phone number and their marketing choice (ADR-0013). Kept apart from `User` on
 * purpose: `User` is what the product shows to friends and has no phone field; a ContactRecord is
 * server-only, never projected into a read model and never readable by any client.
 */
export interface ContactRecord {
  readonly userId: UserId;
  readonly phone: PhoneNumber;
  /** Separate, optional, unticked-by-default consent. Marketing may only use records where this is true. */
  readonly marketingOptIn: boolean;
  /** When the current opt-in was given. Undefined while opted out. */
  readonly marketingOptInAt: Date | undefined;
  readonly updatedAt: Date;
}

/**
 * Builds the record to store. An opt-in keeps its original timestamp across repeat calls; opting out
 * clears it, so a later opt-in is dated afresh.
 */
export const upsertContact = (input: {
  existing: ContactRecord | undefined;
  userId: UserId;
  phone: PhoneNumber;
  marketingOptIn: boolean;
  now: Date;
}): ContactRecord => ({
  userId: input.userId,
  phone: input.phone,
  marketingOptIn: input.marketingOptIn,
  marketingOptInAt: input.marketingOptIn
    ? input.existing?.marketingOptIn
      ? (input.existing.marketingOptInAt ?? input.now)
      : input.now
    : undefined,
  updatedAt: input.now,
});
