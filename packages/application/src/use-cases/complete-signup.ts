import {
  CONSENT_VERSION,
  createUser,
  InvalidArgument,
  normaliseDisplayName,
  upsertContact,
  type PhoneNumber,
  type User,
  type UserId,
} from '@toli/domain';
import type { Clock, ContactRepository, PhoneHasher, UserRepository } from '../ports';

/**
 * Runs on the server after phone OTP. Records the display name and the DPDP consent timestamp on the
 * profile (with the phone only as an HMAC, for matching), and stores the verified phone number and the
 * separate marketing choice in the server-only contact record (ADR-0013). Idempotent: a second call
 * keeps the original consent and creation time and refreshes the name and the marketing choice.
 */
export class CompleteSignup {
  constructor(
    private readonly users: UserRepository,
    private readonly contacts: ContactRepository,
    private readonly hasher: PhoneHasher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: {
    actor: UserId;
    phone: PhoneNumber;
    name: string;
    consent: boolean;
    marketingOptIn: boolean;
  }): Promise<User> {
    if (!cmd.consent) throw new InvalidArgument('consent is required to use Toli');
    const now = this.clock.now();
    const existing = await this.users.get(cmd.actor);
    const phoneHash = this.hasher.hash(cmd.phone);
    // Someone on an older consent text is agreeing to the current one now: re-date it. Someone already
    // current keeps their original date, so a repeat call changes nothing but the name.
    const user: User = existing
      ? {
          ...existing,
          name: normaliseDisplayName(cmd.name),
          phoneHash,
          consentAt: existing.consentVersion < CONSENT_VERSION ? now : existing.consentAt,
          consentVersion: CONSENT_VERSION,
        }
      : createUser({ id: cmd.actor, name: cmd.name, phoneHash, consentAt: now, now });
    const contact = upsertContact({
      existing: await this.contacts.get(cmd.actor),
      userId: cmd.actor,
      phone: cmd.phone,
      marketingOptIn: cmd.marketingOptIn,
      now,
    });
    await this.users.upsert(user);
    await this.contacts.upsert(contact);
    return user;
  }
}
