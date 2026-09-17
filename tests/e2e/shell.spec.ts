import { expect, test } from '@playwright/test';

test('the app shell boots against the emulators', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: /Groups/ })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: /My cards/ }).click();
  await expect(page.getByRole('heading', { name: 'My cards' })).toBeVisible();
});

test('an invite link renders a preview without signing in', async ({ page }) => {
  await page.goto('/join/ABCDEFGH');
  await expect(page.getByRole('heading', { name: /invited/i })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Toli/);
});
