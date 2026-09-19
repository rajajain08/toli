import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { getFirebase, loadAuth } from './firebase';

/**
 * After an account is deleted: sign out and remove this device's offline copy of their data. Best effort;
 * the caller should follow with a full page load, since the Firestore instance is unusable after terminate.
 */
export async function wipeLocalData(): Promise<void> {
  try {
    await (await loadAuth()).signOut();
  } catch {
    // The identity is already gone on the server; a failed local sign-out is cleared by the reload.
  }
  try {
    const { db } = getFirebase();
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    // Another tab holds the database: it is cleared the next time persistence starts cleanly.
  }
  try {
    for (const key of Object.keys(window.localStorage))
      if (key.startsWith('toli:')) window.localStorage.removeItem(key);
  } catch {
    // no storage, nothing to clear
  }
}
