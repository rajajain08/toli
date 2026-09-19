import type { InviteRepository } from '@toli/application';
import { GroupId, Invite, InviteCode } from '@toli/domain';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { adminPaths } from './paths';

const toDate = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : new Date(0));

/** invites/{code}: never readable by any client, so codes cannot be enumerated. */
export class AdminInviteRepository implements InviteRepository {
  constructor(private readonly db: Firestore) {}

  async get(code: InviteCode): Promise<Invite | undefined> {
    const snap = await this.db.doc(adminPaths.invite(code)).get();
    const d = snap.data();
    if (!snap.exists || !d) return undefined;
    return Invite.rehydrate({
      code: InviteCode(snap.id),
      audienceId: GroupId(String(d['audienceId'])),
      createdAt: toDate(d['createdAt']),
      expiresAt: toDate(d['expiresAt']),
      uses: Number(d['uses'] ?? 0),
      maxUses: Number(d['maxUses'] ?? 0),
    });
  }

  async create(invite: Invite): Promise<void> {
    // create(), not set(): a code collision fails loudly instead of hijacking someone's invite.
    await this.db.doc(adminPaths.invite(invite.code)).create({
      audienceId: invite.audienceId,
      createdAt: Timestamp.fromDate(invite.createdAt),
      expiresAt: Timestamp.fromDate(invite.expiresAt),
      uses: invite.uses,
      maxUses: invite.maxUses,
    });
  }

  async consume(invite: Invite): Promise<void> {
    // Increment rather than overwrite, so two people joining at once both count.
    await this.db.doc(adminPaths.invite(invite.code)).update({ uses: FieldValue.increment(1) });
  }
}
