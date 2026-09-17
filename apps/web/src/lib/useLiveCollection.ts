'use client';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { DocumentData, Firestore, Query, QueryDocumentSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import { loadFirebase, type Infra } from './firebase';

/**
 * One hook for every list screen. A Firestore listener pushes into the TanStack cache via setQueryData,
 * so the list is live and stale-while-revalidate for free. Subscribes on mount, unsubscribes on unmount.
 * `build` returns the query once Firebase has loaded, or null to stay idle.
 */
export function useLiveCollection<T>(
  queryKey: QueryKey,
  build: ((infra: Infra, db: Firestore) => Query<DocumentData> | null) | null,
  convert: (doc: QueryDocumentSnapshot<DocumentData>) => T,
) {
  const client = useQueryClient();
  const key = JSON.stringify(queryKey);
  const enabled = build !== null;

  useEffect(() => {
    if (!build) return;
    let cancelled = false;
    let unsubscribe = () => {};
    void loadFirebase().then(({ infra, fb }) => {
      if (cancelled) return;
      const q = build(infra, fb.db);
      if (!q) return;
      unsubscribe = infra.subscribeCollection(
        q,
        convert,
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
