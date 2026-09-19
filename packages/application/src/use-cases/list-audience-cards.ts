import { NotAMember, type GroupId, type UserId } from '@toli/domain';
import type { AudienceRepository, GroupCardReadModel, GroupCardRow } from '../ports';

/** One query per group screen. Rules enforce membership too; this is the same check for non-Firestore callers. */
export class ListAudienceCards {
  constructor(
    private readonly readModel: GroupCardReadModel,
    private readonly audiences: AudienceRepository,
  ) {}

  async execute(query: { actor: UserId; audienceId: GroupId }): Promise<GroupCardRow[]> {
    if (!(await this.audiences.isMember(query.audienceId, query.actor))) throw new NotAMember();
    const rows = await this.readModel.listByAudience(query.audienceId);
    return [...rows].sort(
      (a, b) => a.ownerName.localeCompare(b.ownerName) || b.addedAt.getTime() - a.addedAt.getTime(),
    );
  }
}
