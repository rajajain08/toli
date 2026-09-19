import { CardRow, FactRow, Heading, Lede, Panel, SectionLabel } from '@toli/ui';
import Link from 'next/link';

export const metadata = { title: 'What friends can see · Toli' };

/** DPDP grievance contact. Set NEXT_PUBLIC_GRIEVANCE_EMAIL; the line is left out rather than shown blank. */
const GRIEVANCE_EMAIL = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? '';

const NEVER = [
  'Card number',
  'Expiry & CVV',
  'Credit limit',
  'What you spend',
  'Statements',
  'Points balance',
];

/** The trust screen from Privacy.dc.html. The DPDP grievance contact lands in milestone 6. */
export default function PrivacyPage() {
  return (
    <main
      style={{
        padding: '52px 24px 32px',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        backgroundImage: 'var(--toli-hero-glow)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Heading size="title">What friends can see</Heading>
        <Lede>This is the whole list. There&apos;s nothing else stored to leak.</Lede>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>They see</SectionLabel>
        <CardRow name="Cashback SBI" issuer="SBI" tint="#1C4C9A" tags={['Shopping', '5% online']} />
        <Lede>
          The card&apos;s name, the bank, and the perks we know about it from public info.
          That&apos;s it — exactly what&apos;s above.
        </Lede>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>They never see</SectionLabel>
        <Panel>
          <ul style={{ margin: 0, padding: 0 }}>
            {NEVER.map((item) => (
              <FactRow key={item} tone="never">
                {item}
              </FactRow>
            ))}
          </ul>
        </Panel>
        <Lede>
          We never ask for these, so we can&apos;t store them — there&apos;s no field for them
          anywhere in the app.
        </Lede>
      </section>

      <Lede>
        Only people you&apos;ve added — a group or a person — can see a card. Hide it from any of
        them, anytime.
      </Lede>
      <Lede>
        Toli keeps your phone number to run your account. Friends never see it, and we only message
        you about Toli if you ticked the optional box at sign-up.
      </Lede>
      <Lede>
        Delete your account and every card you added goes with it, immediately, along with your
        phone number.{' '}
        <Link href="/settings/delete" style={{ fontWeight: 600 }}>
          Delete my account
        </Link>
      </Lede>
      {GRIEVANCE_EMAIL ? (
        <Lede>
          Questions or a complaint about your data? Write to our grievance officer at{' '}
          <a href={`mailto:${GRIEVANCE_EMAIL}`} style={{ fontWeight: 600 }}>
            {GRIEVANCE_EMAIL}
          </a>
          .
        </Lede>
      ) : null}

      <Link href="/cards" style={{ fontWeight: 600 }}>
        Got it
      </Link>
    </main>
  );
}
