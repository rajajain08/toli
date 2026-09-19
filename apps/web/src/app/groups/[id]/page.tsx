import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { Group } from './Group';

export const metadata = { title: 'Group · Toli' };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell active="groups">
      <Suspense fallback={<div aria-busy="true" style={{ minHeight: '40dvh' }} />}>
        <Group id={id} />
      </Suspense>
    </AppShell>
  );
}
