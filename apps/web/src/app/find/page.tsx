import { AppShell } from '@/components/AppShell';

export default function FindPage() {
  return (
    <AppShell active="find">
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--toli-font-serif)',
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1.12,
        }}
      >
        Find
      </h1>
      <p style={{ color: 'var(--toli-ink-3)', fontSize: 15 }}>
        Skeleton. Find arrives in milestone 5.
      </p>
    </AppShell>
  );
}
