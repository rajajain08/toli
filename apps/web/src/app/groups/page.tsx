import { AppShell } from '@/components/AppShell';

export default function GroupsPage() {
  return (
    <AppShell active="groups">
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--toli-font-serif)',
          fontWeight: 500,
          fontSize: 28,
          lineHeight: 1.12,
        }}
      >
        Groups
      </h1>
      <p style={{ color: 'var(--toli-ink-3)', fontSize: 15 }}>
        Skeleton. Groups arrive in milestone 4.
      </p>
    </AppShell>
  );
}
