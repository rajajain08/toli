import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('the app opens without a network: visited screens from the cache, the rest as a plain offline page', async ({
  page,
  context,
  request,
}) => {
  await signUp(page, request, 'Offline Asha');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  // The worker installs after load and takes control of this page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((r) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }),
      );
  });
  // A controlled reload, so the navigation copy and the build assets for /groups are in its cache.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  await context.setOffline(true);

  // A screen opened before: still opens, signed in, from the cache and Firestore's local copy.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  // A screen never opened on this device: the plain offline page, not the browser's dinosaur.
  await page.goto('/never-visited-before');
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

  await context.setOffline(false);
  await page.goto('/groups');
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
});

test('the install prompt appears when the browser offers one, installs on tap, and respects “Not now”', async ({
  page,
  request,
}) => {
  await signUp(page, request, 'Installer');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
  // No offer from the browser yet: nothing is shown.
  await expect(page.getByRole('region', { name: 'Install Toli' })).toHaveCount(0);

  // Headless Chrome never fires the real event, so hand the page one shaped exactly like it.
  const offer = () =>
    page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      (window as unknown as { __prompted: number }).__prompted = 0;
      e.prompt = async () => void ((window as unknown as { __prompted: number }).__prompted += 1);
      e.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(e);
    });

  await offer();
  const panel = page.getByRole('region', { name: 'Install Toli' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Install' }).click();
  expect(await page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(
    1,
  );
  // They said no in the browser's dialog: treated as "Not now", and remembered across a reload.
  await expect(panel).toHaveCount(0);
  await page.reload();
  await offer();
  await expect(page.getByRole('region', { name: 'Install Toli' })).toHaveCount(0);
});
