/** Firestore document paths from docs/architecture.md. Keep in sync with infra-admin/src/paths.ts. */
export const paths = {
  user: (uid: string) => `users/${uid}`,
  userCards: (uid: string) => `users/${uid}/cards`,
  userCard: (uid: string, ucId: string) => `users/${uid}/cards/${ucId}`,
  memberships: (uid: string) => `users/${uid}/memberships`,
  audience: (aid: string) => `audiences/${aid}`,
  audienceMembers: (aid: string) => `audiences/${aid}/members`,
  audienceCards: (aid: string) => `audiences/${aid}/cards`,
  audienceMember: (aid: string, uid: string) => `audiences/${aid}/members/${uid}`,
  audienceCard: (aid: string, ucId: string) => `audiences/${aid}/cards/${ucId}`,
  membership: (uid: string, aid: string) => `users/${uid}/memberships/${aid}`,
  catalog: 'catalog',
} as const;
