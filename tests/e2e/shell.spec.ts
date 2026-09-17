import { expect, test } from '@playwright/test';

test('signed-out visitors are sent to sign in', async ({ page }) => {
  await page.goto('/groups');
  await expect(page).toHaveURL(/\/auth\?next=%2Fgroups$/);
  await expect(page.getByLabel('Your phone number')).toBeVisible();
});

test('an invite link renders a preview without signing in', async ({ page }) => {
  await page.goto('/join/ABCDEFGH');
  await expect(page.getByRole('heading', { name: /invited/i })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Toli/);
});
