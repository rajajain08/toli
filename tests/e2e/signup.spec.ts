import { expect, test } from '@playwright/test';
import { freshPhone, latestOtp } from './helpers';

test('a fresh phone signs up with OTP, a name and consent, then lands in the app', async ({
  page,
  request,
}) => {
  const phone = freshPhone();
  await page.goto('/auth');

  await page.getByLabel('Your phone number').fill(phone.national);
  await page.getByRole('button', { name: 'Get code by SMS' }).click();

  await expect(page.getByRole('heading', { name: 'Enter the code' })).toBeVisible();
  await expect(page.getByText(`•••${phone.national.slice(-2)}`)).toBeVisible();
  await page.getByLabel('Code').fill(await latestOtp(request, phone.e164));
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'What should friends call you?' })).toBeVisible();
  await page.getByLabel('Your name').fill('Raja');
  // No consent yet: the message shows by the consent box, and the button must not move a pixel.
  const button = page.getByRole('button', { name: 'Continue' });
  const before = await button.boundingBox();
  await button.click();
  await expect(page.locator('#consent-error')).toContainText('Tick the first box');
  await expect(page.getByLabel(/I agree that Toli stores my name/)).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(await button.boundingBox()).toEqual(before);
  await expect(page.locator('#name-error')).toHaveCount(0);

  // Marketing consent is separate and never pre-ticked.
  await expect(page.getByLabel(/Optional: send me occasional updates/)).not.toBeChecked();
  await page.getByLabel(/Optional: send me occasional updates/).check();
  await page.getByLabel(/I agree that Toli stores my name/).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  // New people land on Add cards (step 2 of 2), then continue to where they were headed.
  await expect(page).toHaveURL(/\/cards\/add\?onboarding=1/);
  await expect(page.getByRole('heading', { name: 'Which cards do you carry?' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  // Second visit skips straight in from the persisted session.
  await page.goto('/cards');
  await expect(page.getByRole('heading', { name: 'My cards' })).toBeVisible();
});

test('a wrong code is rejected in place', async ({ page }) => {
  const phone = freshPhone();
  await page.goto('/auth');
  await page.getByLabel('Your phone number').fill(phone.national);
  await page.getByRole('button', { name: 'Get code by SMS' }).click();
  await page.getByLabel('Code').fill('000000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#code-error')).toContainText('not right');
});

test('a bad phone number never leaves the page', async ({ page }) => {
  await page.goto('/auth');
  await page.getByLabel('Your phone number').fill('12345');
  const send = page.getByRole('button', { name: 'Get code by SMS' });
  const before = await send.boundingBox();
  await send.click();
  await expect(page.locator('#phone-error')).toContainText('valid phone number');
  expect(await send.boundingBox()).toEqual(before);
});
