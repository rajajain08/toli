import { expect, test } from '@playwright/test';
import { completeSignUp, signUp } from './helpers';

/**
 * The milestone 4 golden path from docs/architecture.md: open invite, OTP, add two cards, see them in
 * the group. Two real browser contexts, so the last step also proves the group screen is live.
 */
test('a friend opens an invite, signs up, adds two cards and both people see them in the group', async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);

  // --- Rahul starts a group and shares one card into it.
  const rahulCtx = await browser.newContext();
  const rahul = await rahulCtx.newPage();
  await signUp(rahul, request, 'Rahul');
  await rahul.getByRole('group', { name: 'Banks' }).getByRole('button', { name: 'Axis' }).click();
  await rahul.getByRole('button', { name: 'Add Atlas' }).click();
  await rahul.getByRole('button', { name: 'Done · 1 card' }).click();

  await expect(rahul.getByText('No groups yet')).toBeVisible();
  await rahul.getByRole('link', { name: 'Start a group' }).click();
  await rahul.getByLabel('Group name').fill('Weekend Crew');
  await rahul.getByRole('button', { name: 'Create group' }).click();
  await expect(rahul).toHaveURL(/\/groups\/[^/?]+\?invite=[A-Z0-9]{8}$/);
  await expect(rahul.getByRole('heading', { name: 'Weekend Crew' })).toBeVisible();
  await expect(rahul.getByText('Group created. Now send the link.')).toBeVisible();
  const code = new URL(rahul.url()).searchParams.get('invite')!;
  const groupUrl = rahul.url().split('?')[0]!;

  // The nudge leads to the share step. "Not now" shares nothing.
  await rahul.getByRole('link', { name: 'Choose cards' }).click();
  await expect(
    rahul.getByRole('heading', { name: 'Share your cards with Weekend Crew?' }),
  ).toBeVisible();
  await rahul.getByRole('button', { name: 'Not now' }).click();
  await expect(rahul).toHaveURL(new RegExp(`${new URL(groupUrl).pathname}$`));
  await expect(rahul.getByText('You’re not sharing any cards here yet.')).toBeVisible();

  // Second time he shares: everything is ticked to begin with.
  await rahul.getByRole('link', { name: 'Choose cards' }).click();
  await expect(rahul.getByRole('button', { name: /share Atlas/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await rahul.getByRole('button', { name: 'Share 1 card' }).click();
  await expect(rahul).toHaveURL(new RegExp(`${new URL(groupUrl).pathname}$`));
  const rahulsOwn = rahul.getByRole('region', { name: 'You' });
  await expect(rahulsOwn.getByText('Atlas')).toBeVisible();
  await expect(rahul.getByText('1 member · 1 card')).toBeVisible();

  // --- Priya gets the link on WhatsApp. Signed out, she sees a real preview.
  const priyaCtx = await browser.newContext();
  const priya = await priyaCtx.newPage();
  await priya.goto(`/join/${code}`);
  await expect(
    priya.getByRole('heading', { name: 'Rahul invited you to Weekend Crew' }),
  ).toBeVisible();
  await expect(priya.getByText('1 friend has added 1 card.')).toBeVisible();
  await expect(priya.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Rahul invited you to Weekend Crew on Toli',
  );
  await expect(priya.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    /1 friend has added 1 card/,
  );
  // The preview never names members' cards.
  await expect(priya.getByText('Atlas')).toHaveCount(0);

  await priya.getByRole('link', { name: 'Sign in to join' }).click();
  await completeSignUp(priya, request, 'Priya');

  // Step 2 of 2: two cards, then straight back to the invite.
  await expect(priya.getByRole('heading', { name: 'Which cards do you carry?' })).toBeVisible();
  await priya.getByRole('searchbox', { name: 'Search cards' }).fill('millennia');
  await priya.getByRole('button', { name: 'Add Millennia' }).click();
  await priya.getByRole('searchbox', { name: 'Search cards' }).fill('cashback sbi');
  await priya.getByRole('button', { name: 'Add Cashback SBI' }).click();
  await priya.getByRole('button', { name: 'Done · 2 cards' }).click();

  await expect(priya).toHaveURL(new RegExp(`/join/${code}$`));
  await priya.getByRole('button', { name: 'Join Weekend Crew' }).click();

  // Joining through an invite asks straight away which cards this group may see.
  await expect(priya).toHaveURL(new RegExp(`${new URL(groupUrl).pathname}/share$`));
  await expect(
    priya.getByRole('heading', { name: 'Share your cards with Weekend Crew?' }),
  ).toBeVisible();
  await expect(priya.getByRole('button', { name: 'Share 2 cards' })).toBeVisible();
  // She holds one back.
  await priya.getByRole('button', { name: /share Cashback SBI/ }).click();
  await priya.getByRole('button', { name: 'Share 1 card' }).click();
  await expect(priya).toHaveURL(new RegExp(`${new URL(groupUrl).pathname}$`));

  const priyasOwn = priya.getByRole('region', { name: 'You' });
  await expect(priya.getByRole('region', { name: 'Rahul' }).getByText('Atlas')).toBeVisible();
  await expect(priyasOwn.getByText('Millennia')).toBeVisible();
  await expect(priyasOwn.getByText('Cashback SBI')).toHaveCount(0);
  await expect(priya.getByText('2 members · 2 cards')).toBeVisible();

  // Later she switches the other one on from My cards; it is the newest, so it is the selected card.
  await priya.goto('/cards');
  await expect(priya.getByText('5% cashback on online spends')).toBeVisible();
  await priya.getByRole('switch', { name: 'Hidden from Weekend Crew' }).click();
  await expect(priya.getByRole('switch', { name: 'Visible to Weekend Crew' })).toBeVisible();
  // Saved, not just flipped: leaving the page mid-write would drop the request.
  await expect(priya.getByRole('switch', { name: 'Visible to Weekend Crew' })).not.toHaveAttribute(
    'aria-busy',
    'true',
  );
  await priya.goto(groupUrl);
  await expect(priyasOwn.getByText('Millennia')).toBeVisible();
  await expect(priyasOwn.getByText('Cashback SBI')).toBeVisible();
  await expect(priya.getByText('2 members · 3 cards')).toBeVisible();

  // --- Rahul's screen was open the whole time: it updates without a reload.
  const priyaOnRahuls = rahul.getByRole('region', { name: 'Priya' });
  await expect(priyaOnRahuls.getByText('Millennia')).toBeVisible();
  await expect(priyaOnRahuls.getByText('Cashback SBI')).toBeVisible();
  await expect(rahul.getByText('2 members · 3 cards')).toBeVisible();

  // Filters: by person, then by category.
  await rahul.getByRole('group', { name: 'People' }).getByRole('button', { name: 'Priya' }).click();
  await expect(rahul.getByText('Showing 2 of 3 cards')).toBeVisible();
  await expect(rahul.getByRole('region', { name: 'You' })).toHaveCount(0);

  // Priya withdraws a card; it leaves Rahul's screen.
  await priya.goto('/cards');
  await priya.getByRole('switch', { name: 'Visible to Weekend Crew' }).click();
  await expect(rahul.getByText('Showing 1 of 2 cards')).toBeVisible();

  await rahulCtx.close();
  await priyaCtx.close();
});

test('an expired or unknown invite says one plain thing and leaks nothing', async ({ page }) => {
  await page.goto('/join/ZZZZZZZZ');
  await expect(page.getByRole('heading', { name: 'This invite has expired' })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'This Toli invite has expired',
  );
  await expect(page.getByRole('button', { name: /Join/ })).toHaveCount(0);
});

test('a pasted invite link opens that invite; junk is refused in place', async ({
  page,
  request,
}) => {
  await signUp(page, request, 'Asha');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByLabel('Paste an invite link').fill('hello');
  await page.getByRole('button', { name: 'Open invite' }).click();
  await expect(page.locator('#invite-error')).toContainText('does not look like a Toli invite');
  await page.getByLabel('Paste an invite link').fill('https://toli.app/join/abcd-2345');
  await page.getByRole('button', { name: 'Open invite' }).click();
  await expect(page).toHaveURL(/\/join\/ABCD2345$/);
});
