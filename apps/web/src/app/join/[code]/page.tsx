import { Heading, Lede, Notice, Wordmark } from '@toli/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ButtonLink';
import { JoinPanel } from './JoinPanel';
import { invitePreview } from './preview';

export const dynamic = 'force-dynamic';

const friends = (n: number) => `${n} friend${n === 1 ? ' has' : 's have'}`;
const cardsLine = (members: number, cards: number) =>
  cards === 0
    ? `${friends(members)} joined. Add your cards and you’ll all know whose card to use next time.`
    : `${friends(members)} added ${cards} card${cards === 1 ? '' : 's'}. Add yours and you’ll all know whose card to use next time.`;

/**
 * The one server-rendered route: WhatsApp link previews depend on these Open Graph tags. It shows the
 * group's name, who started it and two counts. Never member names, never cards.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const preview = await invitePreview(code);
  const title = preview
    ? `${preview.inviterName} invited you to ${preview.groupName} on Toli`
    : 'This Toli invite has expired';
  const description = preview
    ? cardsLine(preview.memberCount, preview.cardCount)
    : 'Ask your friend for a fresh link. Invites last seven days.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'Toli', images: ['/og.png'] },
  };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await invitePreview(code);
  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        padding: '52px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        backgroundImage: 'var(--toli-hero-glow)',
      }}
    >
      <Wordmark height={28} />
      {preview ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Heading>
              {preview.inviterName} invited you to {preview.groupName}
            </Heading>
            <Lede>{cardsLine(preview.memberCount, preview.cardCount)}</Lede>
          </div>
          <JoinPanel code={code} groupName={preview.groupName} />
          <Notice>
            We only store card names. Never card numbers, CVV, limits or balances.{' '}
            <Link href="/privacy" style={{ fontWeight: 600 }}>
              See exactly what friends see
            </Link>
          </Notice>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Heading>This invite has expired</Heading>
            <Lede>Invites last seven days. Ask your friend to send a fresh link.</Lede>
          </div>
          <ButtonLink href="/groups" variant="secondary" full>
            Go to your groups
          </ButtonLink>
        </>
      )}
    </main>
  );
}
