import { Suspense } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { SharePerson } from './SharePerson';

export const metadata = { title: 'Share with a person · Toli' };

export default function SharePage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '60dvh' }} />}>
      <RequireAuth>
        <SharePerson />
      </RequireAuth>
    </Suspense>
  );
}
