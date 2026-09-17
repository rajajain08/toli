import {
  createUser,
  InvalidArgument,
  normaliseDisplayName,
  type PhoneNumber,
  type User,
  type UserId,
} from '@toli/domain';
import type { Clock, PhoneHasher, UserRepository } from '../ports';

/**
 * Runs on the server after phone OTP. Records the display name and the DPDP consent timestamp and
 * stores the phone only as an HMAC. Idempotent: a second call keeps the original consent and
 * creation time and only refreshes the name.
 */
export class CompleteSignup {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PhoneHasher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: {
    actor: UserId;
    phone: PhoneNumber;
    name: string;
    consent: boolean;
  }): Promise<User> {
    if (!cmd.consent) throw new InvalidArgument('consent is required to use Toli');
    const now = this.clock.now();
    const existing = await this.users.get(cmd.actor);
    const user: User = existing
      ? {
          ...existing,
          name: normaliseDisplayName(cmd.name),
          phoneHash: this.hasher.hash(cmd.phone),
        }
      : createUser({
          id: cmd.actor,
          name: cmd.name,
          phoneHash: this.hasher.hash(cmd.phone),
          consentAt: now,
          now,
        });
    await this.users.upsert(user);
    return user;
  }
}
