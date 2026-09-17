import type { GroupId, UserId } from './ids';

export type MemberRole = 'owner' | 'member';

export interface Membership {
  readonly audienceId: GroupId;
  readonly userId: UserId;
  readonly joinedAt: Date;
  readonly role: MemberRole;
}

export const createMembership = (input: {
  audienceId: GroupId;
  userId: UserId;
  role: MemberRole;
  now: Date;
}): Membership => ({
  audienceId: input.audienceId,
  userId: input.userId,
  role: input.role,
  joinedAt: input.now,
});
