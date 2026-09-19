/** The shorter ids were taken when the projects were created; these are the real ones. */
export const PROD_PROJECT_ID = 'toli-app-prod';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/;

/**
 * "Never point local code at production" (CLAUDE.md), enforced rather than remembered. Two ways it could
 * happen: emulator mode left on with the prod project id, or a laptop build carrying the real prod values.
 * `hostname` is undefined on the server, where only the first case can be checked.
 */
export function assertNotLocalProd(input: {
  projectId: string;
  useEmulators: boolean;
  hostname: string | undefined;
}): void {
  if (input.projectId !== PROD_PROJECT_ID) return;
  if (input.useEmulators)
    throw new Error(`never point local code at ${PROD_PROJECT_ID}: emulator mode is on`);
  if (input.hostname !== undefined && LOCAL_HOST.test(input.hostname))
    throw new Error(
      `never point local code at ${PROD_PROJECT_ID}: this page is served from ${input.hostname}`,
    );
}
