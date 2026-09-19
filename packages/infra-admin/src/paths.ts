/** Firestore document paths from docs/architecture.md. Keep in sync with infra-client/src/paths.ts. */
export const paths = {
  user: (uid: string) => `users/${uid}`,
  userCards: (uid: string) => `users/${uid}/cards`,
  userCard: (uid: string, ucId: string) => `users/${uid}/cards/${ucId}`,
  memberships: (uid: string) => `users/${uid}/memberships`,
  audience: (aid: string) => `audiences/${aid}`,
  audienceMembers: (aid: string) => `audiences/${aid}/members`,
  audienceCards: (aid: string) => `audiences/${aid}/cards`,
  catalog: 'catalog',
} as const;
export const adminPaths = {
  invite: (code: string) => `invites/${code}`,
  ratelimit: (uid: string) => `ratelimits/${uid}`,
  contact: (uid: string) => `contacts/${uid}`,
} as const;
