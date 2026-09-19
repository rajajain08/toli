'use client';
import type { LiveQuery } from '@toli/infra-client';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Firestore } from 'firebase/firestore';
import { useEffect } from 'react';
import { loadFirebase, type Infra } from './firebase';

/**
 * One hook for every list screen. A Firestore listener pushes into the TanStack cache via setQueryData,
 * so the list is live and stale-while-revalidate for free. Subscribes on mount, unsubscribes on unmount.
 * `build` runs once Firebase has loaded and returns the query plus its converter, or null to stay idle.
 */
export function useLiveCollection<T>(queryKey: QueryKey, build: ((infra: Infra, db: Firestore) => LiveQuery<T> | null) | null) {
  const client = useQueryClient();
  const key = JSON.stringify(queryKey);
  const enabled = build !== null;

  useEffect(() => {
    if (!build) return;
    let cancelled = false;
    let unsubscribe = () => {};
    void loadFirebase().then(({ infra, fb }) => {
      if (cancelled) return;
      const live = build(infra, fb.db);
      if (!live) return;
      unsubscribe = infra.subscribeCollection(
        live.query,
        live.convert,
        (rows) => client.setQueryData<T[]>(queryKey, rows),
        (error) => console.error('live collection error', queryKey, error),
      );
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return useQuery<T[]>({
    queryKey,
    queryFn: () => new Promise<T[]>(() => {}),
    enabled,
    staleTime: Infinity,
  });
}
