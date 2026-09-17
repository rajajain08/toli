/** MVP bounds. ADR-0007: they bound fan-out and Firestore batch size. */
export const LIMITS = {
  audiencesPerCard: 50,
  membersPerAudience: 50,
  inviteCodeLength: 8,
  inviteTtlMs: 7 * 24 * 60 * 60 * 1000,
  inviteDefaultMaxUses: 50,
  nameMaxLength: 40,
  audienceNameMaxLength: 40,
} as const;
