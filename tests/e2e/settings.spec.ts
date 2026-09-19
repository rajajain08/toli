import { expect, test } from '@playwright/test';
import { contactExists, makeLegacyAccount, signUp, uidForPhone } from './helpers';

test('marketing messages can be switched off and on from Settings, and it sticks', async ({
  page,
  request,
}) => {
  await signUp(page, request, 'Meera');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: /My cards/ })
    .click();
  await page.getByRole('link', { name: 'settings' }).click();

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('Meera', { exact: true })).toBeVisible();
  // Only the last two digits are ever shown, even to the owner.
  await expect(page.getByText(/^Phone ••••• •••\d\d$/)).toBeVisible();

  // The sign-up helper leaves the optional box unticked, so this starts off.
  const off = page.getByRole('switch', { name: 'Send me updates and offers from Toli' });
  await expect(off).toHaveAttribute('aria-checked', 'false');
  await off.click();
  const on = page.getByRole('switch', { name: 'Stop updates and offers from Toli' });
  await expect(on).toHaveAttribute('aria-checked', 'true');
  // The switch flips at once; wait until it says the change is saved before leaving the page.
  await expect(on).not.toHaveAttribute('aria-busy', 'true');

  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Stop updates and offers from Toli' }),
  ).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch', { name: 'Stop updates and offers from Toli' }).click();
  await expect(
    page.getByRole('switch', { name: 'Send me updates and offers from Toli' }),
  ).not.toHaveAttribute('aria-busy', 'true');
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Send me updates and offers from Toli' }),
  ).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Your phone number')).toBeVisible();
});

test('an account that agreed to the old consent text is asked again, then carries on where it was', async ({
  page,
  request,
}) => {
  const phone = await signUp(page, request, 'Old Timer');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  const uid = await uidForPhone(request, phone.e164);
  await makeLegacyAccount(request, uid);
  expect(await contactExists(request, uid)).toBe(false);

  // Next visit: gated, with the reason, the name already filled in, and nothing pre-ticked.
  await page.goto('/cards');
  await expect(page).toHaveURL(/\/auth\?next=%2Fcards$/);
  await expect(page.getByRole('heading', { name: 'We’ve updated what Toli stores' })).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Old Timer');
  await expect(
    page.getByLabel(/I agree that Toli stores my name, my phone number/),
  ).not.toBeChecked();
  await expect(page.getByLabel(/Optional: send me occasional updates/)).not.toBeChecked();

  // Refusing keeps them out.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#consent-error')).toContainText('Tick the first box');

  await page.getByLabel(/I agree that Toli stores my name, my phone number/).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Straight back to where they were going, not through Add cards again, and the phone is now on file.
  await expect(page).toHaveURL(/\/cards$/);
  await expect(page.getByRole('heading', { name: 'My cards' })).toBeVisible();
  expect(await contactExists(request, uid)).toBe(true);
});
