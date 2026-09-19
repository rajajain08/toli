import { Wordmark } from '@toli/ui';
import type { Metadata } from 'next';

/**
 * The one server-rendered route. In milestone 4 it reads a public preview through infra-admin and
 * renders Open Graph tags so the link unfurls in WhatsApp. For now it renders a static preview.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: 'You’re invited to a group on Toli',
    description: 'See which cards your friends hold. Names and perks only, never numbers.',
    openGraph: {
      title: 'Join a group on Toli',
      description: `Invite ${code}`,
      type: 'website',
      images: ['/og.png'],
    },
  };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <main style={{ padding: '52px 24px', maxWidth: 480, margin: '0 auto' }}>
      <Wordmark height={28} />
      <h1
        style={{
          margin: '28px 0 0',
          fontFamily: 'var(--toli-font-serif)',
          fontWeight: 500,
          fontSize: 28,
        }}
      >
        You’re invited
      </h1>
      <p style={{ color: 'var(--toli-ink-3)', fontSize: 15 }}>
        Invite code {code}. Joining arrives in milestone 4.
      </p>
    </main>
  );
}
