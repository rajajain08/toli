'use client';
import type { LiveDoc } from '@toli/infra-client';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Firestore } from 'firebase/firestore';
import { useEffect } from 'react';
import { loadFirebase, type Infra } from './firebase';

/** useLiveCollection's sibling for a single document. `null` means it does not exist or access was lost. */
export function useLiveDoc<T>(queryKey: QueryKey, build: ((infra: Infra, db: Firestore) => LiveDoc<T>) | null) {
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
      unsubscribe = infra.subscribeDocument(
        live.ref,
        live.convert,
        (value) => client.setQueryData<T | null>(queryKey, value),
        () => client.setQueryData<T | null>(queryKey, null),
      );
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return useQuery<T | null>({ queryKey, queryFn: () => new Promise<T | null>(() => {}), enabled, staleTime: Infinity });
}
