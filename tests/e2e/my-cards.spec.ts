import { expect, test } from '@playwright/test';
import { signUp, swipe } from './helpers';

test('single-player: add two cards, see them in My cards, remove one, survive a reload', async ({
  page,
  request,
}) => {
  await signUp(page, request);
  await expect(page.getByRole('heading', { name: 'Which cards do you carry?' })).toBeVisible();
  await expect(page.getByText('Nothing added yet')).toBeVisible();

  // Bank chip narrows the list; search works in memory.
  await page.getByRole('group', { name: 'Banks' }).getByRole('button', { name: 'Axis' }).click();
  await expect(page.getByRole('button', { name: 'Add Atlas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Millennia' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Atlas' }).click();
  await expect(page.getByRole('button', { name: 'Done · 1 card' })).toBeVisible();

  await page
    .getByRole('group', { name: 'Banks' })
    .getByRole('button', { name: 'All banks' })
    .click();
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('millennia');
  await page.getByRole('button', { name: 'Add Millennia' }).click();
  await expect(page.getByRole('button', { name: 'Done · 2 cards' })).toBeVisible();
  await expect(page.getByLabel('2 selected')).toBeVisible();

  // The tray removes too, and the row flips back to Add.
  await page.getByRole('searchbox', { name: 'Search cards' }).fill('');
  await page.getByRole('button', { name: 'Done · 2 cards' }).click();
  await expect(page).toHaveURL(/\/groups$/);

  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: /My cards/ })
    .click();
  await expect(page.getByText('2 cards')).toBeVisible();
  const wallet = page.getByRole('group', { name: 'Your cards' });
  await expect(wallet.getByRole('button', { name: 'Select Millennia' })).toBeVisible();
  await expect(wallet.getByRole('button', { name: 'Select Atlas' })).toBeVisible();
  await expect(page.getByText('Private — only you').first()).toBeVisible();

  // Newest first: Millennia is selected, its perks show.
  await expect(page.getByText('5% cashback on Amazon, Flipkart, Swiggy')).toBeVisible();

  // Swiping the card itself moves the wallet: the next card becomes the selected one, its perks show,
  // the dots follow. Then back again.
  await swipe(page, wallet, -300);
  // The track itself moved under the finger, and snapped to the second card.
  await expect.poll(() => wallet.evaluate((el) => Math.round(el.scrollLeft))).toBe(302);
  await expect(wallet.getByRole('button', { name: 'Select Atlas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('EDGE Miles on travel spends')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Atlas' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await swipe(page, wallet, 300);
  await expect.poll(() => wallet.evaluate((el) => Math.round(el.scrollLeft))).toBe(0);
  await expect(wallet.getByRole('button', { name: 'Select Millennia' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('5% cashback on Amazon, Flipkart, Swiggy')).toBeVisible();

  await page.getByRole('button', { name: 'Remove this card' }).click();
  await page.getByRole('button', { name: 'Remove Millennia' }).click();
  await expect(page.getByText('1 card ·')).toBeVisible();
  await expect(wallet.getByRole('button', { name: 'Select Millennia' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('1 card ·')).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Your cards' }).getByRole('button', { name: 'Select Atlas' }),
  ).toBeVisible();
});

test('the privacy screen lists what is never stored', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'What friends can see' })).toBeVisible();
  for (const item of ['Card number', 'Expiry and CVV', 'Credit limit', 'What you spend'])
    await expect(page.getByText(item, { exact: true })).toBeVisible();
});
