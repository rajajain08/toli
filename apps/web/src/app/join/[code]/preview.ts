import { GetInvitePreview, type InvitePreview } from '@toli/application';
import {
  AdminAudienceRepository,
  AdminInviteRepository,
  AdminUserRepository,
  getAdminDb,
  SystemClock,
} from '@toli/infra-admin';

/**
 * Server only. The one place the web app touches the Admin SDK: the invite link must render a preview
 * (and Open Graph tags) for someone who is not signed in, and clients can never read invites.
 */
let useCase: GetInvitePreview | undefined;

export async function invitePreview(code: string): Promise<InvitePreview | undefined> {
  try {
    if (!useCase) {
      const db = getAdminDb();
      useCase = new GetInvitePreview(
        new AdminInviteRepository(db),
        new AdminAudienceRepository(db),
        new AdminUserRepository(db),
        new SystemClock(),
      );
    }
    return await useCase.execute({ code });
  } catch (err) {
    console.error('invite preview failed', err);
    return undefined;
  }
}
