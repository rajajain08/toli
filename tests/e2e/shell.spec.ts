import { expect, test } from '@playwright/test';

test('signed-out visitors are sent to sign in', async ({ page }) => {
  await page.goto('/groups');
  await expect(page).toHaveURL(/\/auth\?next=%2Fgroups$/);
  await expect(page.getByLabel('Your phone number')).toBeVisible();
});
