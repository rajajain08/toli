import { AppShell } from '@/components/AppShell';

export default function MyCardsPage() {
  return (
    <AppShell active="cards">
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--toli-font-serif)',
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1.12,
        }}
      >
        My cards
      </h1>
      <p style={{ color: 'var(--toli-ink-3)', fontSize: 15 }}>
        Skeleton. My cards arrives in milestone 3.
      </p>
    </AppShell>
  );
}
