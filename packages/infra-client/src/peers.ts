import { UserId } from '@toli/domain';
import { collection, getDocs, type Firestore } from 'firebase/firestore';
import { paths } from './paths';
import type { Peer } from './queries';

/**
 * The people in your groups, each once, with the groups you share. A one-shot read (at most one small
 * query per group, served from the cache when offline); the picker does not need to be live.
 */
export async function listPeers(db: Firestore, me: UserId): Promise<Peer[]> {
  const memberships = await getDocs(collection(db, paths.memberships(me)));
  const groups = memberships.docs.filter((m) => m.data()['type'] !== 'direct');
  const peers = new Map<string, Peer>();
  await Promise.all(
    groups.map(async (g) => {
      const groupName =
        typeof g.data()['name'] === 'string' ? (g.data()['name'] as string) : 'a group';
      const members = await getDocs(collection(db, paths.audienceMembers(g.id)));
      for (const m of members.docs) {
        if (m.id === me) continue;
        const peer = peers.get(m.id) ?? {
          userId: UserId(m.id),
          name: String(m.data()['name'] ?? ''),
          groups: [],
        };
        peer.groups.push(groupName);
        peers.set(m.id, peer);
      }
    }),
  );
  return [...peers.values()].sort((a, b) => a.name.localeCompare(b.name));
}
