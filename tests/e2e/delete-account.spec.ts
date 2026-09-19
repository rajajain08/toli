import { expect, test } from '@playwright/test';
import { completeSignUp, docExists, signUp, uidForPhone } from './helpers';

test('deleting an account erases it everywhere, and friends stop seeing the person at once', async ({
  browser,
  request,
}) => {
  test.setTimeout(150_000);

  // Rahul starts a group; Priya joins with one card and shares it.
  const rahulCtx = await browser.newContext();
  const rahul = await rahulCtx.newPage();
  await signUp(rahul, request, 'Rahul');
  await rahul.getByRole('button', { name: 'Skip for now' }).click();
  await rahul.getByRole('link', { name: 'Start a group' }).click();
  await rahul.getByLabel('Group name').fill('Weekend Crew');
  await rahul.getByRole('button', { name: 'Create group' }).click();
  await expect(rahul).toHaveURL(/\?invite=[A-Z0-9]{8}$/);
  const code = new URL(rahul.url()).searchParams.get('invite')!;

  const priyaCtx = await browser.newContext();
  const priya = await priyaCtx.newPage();
  await priya.goto(`/join/${code}`);
  await priya.getByRole('link', { name: 'Sign in to join' }).click();
  const phone = await completeSignUp(priya, request, 'Priya');
  await priya.getByRole('searchbox', { name: 'Search cards' }).fill('millennia');
  await priya.getByRole('button', { name: 'Add Millennia' }).click();
  await priya.getByRole('button', { name: 'Done · 1 card' }).click();
  await priya.getByRole('button', { name: 'Join Weekend Crew' }).click();
  await priya.getByRole('button', { name: 'Share 1 card' }).click();

  await expect(rahul.getByRole('region', { name: 'Priya' }).getByText('Millennia')).toBeVisible();
  await expect(rahul.getByText('2 members · 1 card')).toBeVisible();
  const uid = await uidForPhone(request, phone.e164);
  expect(await docExists(request, `contacts/${uid}`)).toBe(true);

  // Settings → Delete my account. The button stays off until she says she understands.
  await priya.goto('/settings');
  await priya.getByRole('link', { name: 'Delete my account' }).click();
  await expect(priya.getByRole('heading', { name: 'Delete your account' })).toBeVisible();
  await expect(priya.getByText('Your name and your phone number')).toBeVisible();
  const del = priya.getByRole('button', { name: 'Delete my account' });
  await expect(del).toBeDisabled();
  await priya.getByLabel('I understand this deletes my account and cannot be undone.').check();
  await del.click();

  // She lands signed out, told plainly what happened, and cannot get back in with the old session.
  await expect(priya).toHaveURL(/\/auth\?deleted=1$/);
  await expect(priya.getByRole('status')).toContainText(
    'Your account and everything in it has been deleted.',
  );
  await priya.goto('/cards');
  await expect(priya).toHaveURL(/\/auth\?next=%2Fcards$/);

  // Rahul never touched his screen: she and her card are gone from it.
  await expect(rahul.getByRole('region', { name: 'Priya' })).toHaveCount(0);
  await expect(rahul.getByText('Millennia')).toHaveCount(0);
  await expect(rahul.getByText('1 member · 0 cards')).toBeVisible();

  // And from the database: profile, wallet, membership, phone record.
  for (const path of [`users/${uid}`, `contacts/${uid}`])
    expect(await docExists(request, path), path).toBe(false);

  await rahulCtx.close();
  await priyaCtx.close();
});

test('the privacy page points at delete account', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('link', { name: 'Delete my account' })).toHaveAttribute(
    'href',
    '/settings/delete',
  );
});
