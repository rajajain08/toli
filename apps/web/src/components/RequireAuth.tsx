'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { isReady, useAuth } from '@/lib/auth';

/** Gate for authenticated routes. Signed out, or signed in without a profile, goes to /auth and comes back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const ready = isReady(state);

  useEffect(() => {
    if (state.status === 'loading' || ready) return;
    router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
  }, [state.status, ready, router, pathname]);

  if (!ready) return <div aria-busy="true" style={{ minHeight: '60dvh' }} />;
  return <>{children}</>;
}
