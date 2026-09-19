import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

/**
 * Live subscription to a query. The presentation layer pushes `onData` into its cache
 * (TanStack Query `setQueryData`); this module stays free of React.
 */
export function subscribeCollection<T>(
  query: Query<DocumentData>,
  convert: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  onData: (rows: T[], meta: { fromCache: boolean }) => void,
  onError: (error: Error) => void = () => {},
): () => void {
  return onSnapshot(
    query,
    (snap) => onData(snap.docs.map(convert), { fromCache: snap.metadata.fromCache }),
    onError,
  );
}

/** Live subscription to one document; `null` when it does not exist (or the reader lost access). */
export function subscribeDocument<T>(
  ref: DocumentReference<DocumentData>,
  convert: (snap: DocumentSnapshot<DocumentData>) => T | null,
  onData: (value: T | null) => void,
  onError: (error: Error) => void = () => {},
): () => void {
  return onSnapshot(ref, (snap) => onData(convert(snap)), onError);
}
