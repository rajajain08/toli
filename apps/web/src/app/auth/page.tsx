import { Suspense } from 'react';
import { AuthFlow } from './AuthFlow';

export const metadata = { title: 'Sign in · Toli' };

export default function AuthPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '60dvh' }} />}>
      <AuthFlow />
    </Suspense>
  );
}
