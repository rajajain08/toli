import { UserCard, type CardId, type GroupId, type UserCardId, type UserId } from '@toli/domain';
import type {
  AudienceRepository,
  CardCatalogReader,
  GroupCardReadModel,
  GroupCardRow,
  UserRepository,
} from '../ports';

export interface UserCardSnapshot {
  cardId: CardId;
  visibleTo: readonly GroupId[];
  addedAt: Date;
}

/**
 * Write side to read side. Runs in the Firestore trigger on users/{uid}/cards/{ucId}. Diffs visibility
 * and projects a denormalised row into each added audience, removing it from each removed one.
 *
 * The client writes `visibleTo` itself and rules cannot check membership of every id in a list, so this
 * is where it is enforced: a card is only ever projected into an audience its owner belongs to.
 * Everything here tolerates redelivery.
 */
export class ProjectUserCard {
  constructor(
    private readonly readModel: GroupCardReadModel,
    private readonly audiences: AudienceRepository,
    private readonly users: UserRepository,
    private readonly catalog: CardCatalogReader,
  ) {}

  async execute(cmd: {
    ownerId: UserId;
    userCardId: UserCardId;
    before: UserCardSnapshot | undefined;
    after: UserCardSnapshot | undefined;
  }): Promise<{ projected: GroupId[]; removed: GroupId[]; refused: GroupId[] }> {
    const { added, removed } = UserCard.diffVisibility(
      cmd.before ? new Set(cmd.before.visibleTo) : undefined,
      cmd.after ? new Set(cmd.after.visibleTo) : undefined,
    );

    if (removed.length > 0)
      await this.readModel.unproject(
        removed.map((audienceId) => ({ audienceId, userCardId: cmd.userCardId })),
      );

    const projected: GroupId[] = [];
    const refused: GroupId[] = [];
    if (cmd.after && added.length > 0) {
      const info = this.catalog.get(cmd.after.cardId);
      const owner = await this.users.get(cmd.ownerId);
      const rows: GroupCardRow[] = [];
      for (const audienceId of added) {
        if (!info || !owner || !(await this.audiences.isMember(audienceId, cmd.ownerId))) {
          refused.push(audienceId);
          continue;
        }
        rows.push({
          audienceId,
          userCardId: cmd.userCardId,
          ownerId: cmd.ownerId,
          ownerName: owner.name,
          cardId: cmd.after.cardId,
          name: info.name,
          issuer: info.issuer,
          color: info.color,
          tags: info.tags,
          addedAt: cmd.after.addedAt,
        });
        projected.push(audienceId);
      }
      if (rows.length > 0) await this.readModel.project(rows);
    }
    return { projected, removed, refused };
  }
}
