import { Suspense } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { AddCards } from './AddCards';

export const metadata = { title: 'Add your cards · Toli' };

export default function AddCardsPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '60dvh' }} />}>
      <RequireAuth>
        <AddCards />
      </RequireAuth>
    </Suspense>
  );
}
