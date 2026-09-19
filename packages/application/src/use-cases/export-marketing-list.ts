import { needsConsent, type UserId } from '@toli/domain';
import type {
  CardCatalogReader,
  ContactRepository,
  UserCardRepository,
  UserRepository,
} from '../ports';

export interface MarketingRow {
  userId: UserId;
  name: string;
  phone: string;
  optedInAt: Date;
  /** Catalogue names of the cards they hold, e.g. "HDFC Millennia". Card names only; nothing else exists. */
  cards: string[];
}

export interface MarketingExport {
  rows: MarketingRow[];
  /** Opted in, but left out, and why. Counts only: no identities, so the summary is safe to print. */
  skipped: { noProfile: number; consentOutdated: number };
}

/**
 * The marketing list (ADR-0013): name, phone and cards held, for people who said yes to marketing and
 * nobody else. Server-side only; there is no client path to contacts. Two groups are left out even though
 * their flag says yes: anyone without a profile (a half-deleted account must never be messaged), and anyone
 * whose consent is on an older text than the current one, until they agree again.
 */
export class ExportMarketingList {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly users: UserRepository,
    private readonly cards: UserCardRepository,
    private readonly catalog: CardCatalogReader,
  ) {}

  async execute(): Promise<MarketingExport> {
    const optedIn = await this.contacts.listOptedIn();
    const rows: MarketingRow[] = [];
    const skipped = { noProfile: 0, consentOutdated: 0 };
    for (const contact of optedIn) {
      // Belt and braces: the adapter filters too, but this list must never contain a "no".
      if (!contact.marketingOptIn || !contact.marketingOptInAt) continue;
      const user = await this.users.get(contact.userId);
      if (!user) {
        skipped.noProfile++;
        continue;
      }
      if (needsConsent(user)) {
        skipped.consentOutdated++;
        continue;
      }
      const held = await this.cards.listByOwner(contact.userId);
      const names = held
        .map((c) => {
          const info = this.catalog.get(c.cardId);
          return info ? `${info.issuer} ${info.name}` : undefined;
        })
        .filter((n): n is string => n !== undefined)
        .sort();
      rows.push({
        userId: contact.userId,
        name: user.name,
        phone: contact.phone,
        optedInAt: contact.marketingOptInAt,
        cards: names,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId));
    return { rows, skipped };
  }
}

const quote = (v: string): string => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Free text (a display name is user input). Spreadsheets run cells that start with = + - @ as formulas,
 * so those get a leading apostrophe. Not applied to the phone column: it is a validated E.164 number,
 * it legitimately starts with "+", and the tools that import this file need it untouched.
 */
const text = (v: string): string => quote(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

/** RFC 4180 CSV, with formula injection neutralised. */
export const marketingCsv = (rows: readonly MarketingRow[]): string =>
  [
    'name,phone,opted_in_at,cards',
    ...rows.map((r) =>
      [text(r.name), quote(r.phone), r.optedInAt.toISOString(), text(r.cards.join('; '))].join(','),
    ),
  ].join('\n') + '\n';
