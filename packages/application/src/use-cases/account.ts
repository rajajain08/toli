import { maskPhone, needsConsent, NotFound, upsertContact, type UserId } from '@toli/domain';
import type { Clock, ContactRepository, UserRepository } from '../ports';

export interface MyAccount {
  name: string;
  /** Only ever the last two digits. The number itself never leaves the server. */
  phoneMasked: string | undefined;
  marketingOptIn: boolean;
  needsConsent: boolean;
}

/** What the Settings screen may show. Clients cannot read contacts/{uid}, so this is the only window onto it. */
export class GetMyAccount {
  constructor(
    private readonly users: UserRepository,
    private readonly contacts: ContactRepository,
  ) {}

  async execute(query: { actor: UserId }): Promise<MyAccount> {
    const user = await this.users.get(query.actor);
    if (!user) throw new NotFound('user');
    const contact = await this.contacts.get(query.actor);
    return {
      name: user.name,
      phoneMasked: contact ? maskPhone(contact.phone) : undefined,
      marketingOptIn: contact?.marketingOptIn ?? false,
      needsConsent: needsConsent(user),
    };
  }
}

/**
 * Turns marketing messages on or off at any time. Withdrawing is as easy as giving: one switch, effective
 * at once. It can never create a contact record: the phone only enters the system through sign-up consent.
 */
export class SetMarketingOptIn {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: { actor: UserId; optIn: boolean }): Promise<{ marketingOptIn: boolean }> {
    const existing = await this.contacts.get(cmd.actor);
    if (!existing) throw new NotFound('contact');
    const next = upsertContact({
      existing,
      userId: cmd.actor,
      phone: existing.phone,
      marketingOptIn: cmd.optIn,
      now: this.clock.now(),
    });
    await this.contacts.upsert(next);
    return { marketingOptIn: next.marketingOptIn };
  }
}
