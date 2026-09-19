import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { completeSignUp, signUp } from './helpers';

/** Rahul starts "Weekend Crew" holding Atlas; Priya joins holding Millennia and Cashback SBI, sharing only Millennia. */
async function twoFriends(
  browser: Browser,
  request: APIRequestContext,
): Promise<{ rahul: Page; priya: Page; close: () => Promise<void> }> {
  const rahulCtx = await browser.newContext();
  const rahul = await rahulCtx.newPage();
  await signUp(rahul, request, 'Rahul');
  await rahul.getByRole('searchbox', { name: 'Search cards' }).fill('atlas');
  await rahul.getByRole('button', { name: 'Add Atlas' }).click();
  await rahul.getByRole('button', { name: 'Done · 1 card' }).click();
  await rahul.getByRole('link', { name: 'Start a group' }).click();
  await rahul.getByLabel('Group name').fill('Weekend Crew');
  await rahul.getByRole('button', { name: 'Create group' }).click();
  await expect(rahul).toHaveURL(/\?invite=[A-Z0-9]{8}$/);
  const code = new URL(rahul.url()).searchParams.get('invite')!;
  await rahul.getByRole('link', { name: 'Choose cards' }).click();
  await rahul.getByRole('button', { name: 'Share 1 card' }).click();

  const priyaCtx = await browser.newContext();
  const priya = await priyaCtx.newPage();
  await priya.goto(`/join/${code}`);
  await priya.getByRole('link', { name: 'Sign in to join' }).click();
  await completeSignUp(priya, request, 'Priya');
  await priya.getByRole('searchbox', { name: 'Search cards' }).fill('millennia');
  await priya.getByRole('button', { name: 'Add Millennia' }).click();
  await priya.getByRole('searchbox', { name: 'Search cards' }).fill('cashback sbi');
  await priya.getByRole('button', { name: 'Add Cashback SBI' }).click();
  await priya.getByRole('button', { name: 'Done · 2 cards' }).click();
  await priya.getByRole('button', { name: 'Join Weekend Crew' }).click();
  await priya.getByRole('button', { name: /share Cashback SBI/ }).click();
  await priya.getByRole('button', { name: 'Share 1 card' }).click();
  await expect(priya.getByText('2 members · 2 cards')).toBeVisible();

  return {
    rahul,
    priya,
    close: async () => void (await Promise.all([rahulCtx.close(), priyaCtx.close()])),
  };
}

test('share one card with one person, and find who has a card across a group and a 1:1 share', async ({
  browser,
  request,
}) => {
  test.setTimeout(150_000);
  const { rahul, priya, close } = await twoFriends(browser, request);

  // --- Priya shares Cashback SBI with Rahul alone. The picker offers people from her groups.
  await priya.goto('/cards');
  await priya.getByRole('link', { name: 'Add person' }).click();
  await expect(priya.getByRole('heading', { name: 'Share with a person' })).toBeVisible();
  await priya.getByRole('button', { name: 'Share with Rahul' }).click();
  await expect(priya.getByText('In Weekend Crew')).toBeVisible();
  // Nothing is ticked to begin with here: a 1:1 share is deliberate, card by card.
  await expect(priya.getByRole('button', { name: /^Share Cashback SBI$/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await priya.getByRole('button', { name: /^Share Cashback SBI$/ }).click();
  await priya.getByRole('button', { name: 'Share 1 card with Rahul' }).click();

  // A 1:1 share is a two-member audience: same screen, titled with the other person, no invite.
  await expect(priya).toHaveURL(/\/groups\/direct_/);
  await expect(priya.getByRole('heading', { name: 'Rahul' })).toBeVisible();
  await expect(priya.getByText('Just the two of you · 1 card')).toBeVisible();
  await expect(priya.getByRole('button', { name: 'Invite' })).toHaveCount(0);

  // Her wallet now says who sees that card.
  await priya.goto('/cards');
  await expect(priya.getByText('Visible to 1 · 1 person')).toBeVisible();
  await expect(priya.getByRole('switch', { name: 'Visible to Rahul' })).toBeVisible();

  // --- Rahul sees it arrive under "Shared with you".
  await rahul.goto('/groups');
  const shared = rahul.getByRole('link', { name: /Priya/ }).filter({ hasText: 'between you' });
  await expect(shared).toContainText('1 card between you');
  await shared.click();
  await expect(
    rahul.getByRole('region', { name: 'Priya' }).getByText('Cashback SBI'),
  ).toBeVisible();

  // --- Find: a card she shares 1:1 only.
  await rahul
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: /Find/ })
    .click();
  await expect(rahul.getByRole('heading', { name: 'Who has this card?' })).toBeVisible();
  await rahul.getByRole('searchbox', { name: 'Search for a card' }).fill('cashback sbi');
  await rahul
    .getByRole('option', { name: /Cashback SBI/ })
    .first()
    .click();
  await expect(rahul.getByText('1 person you know has it')).toBeVisible();
  const holders = rahul.getByRole('region', { name: 'People who have it' });
  await expect(holders.getByText('Priya', { exact: true })).toBeVisible();
  await expect(holders.getByText('Shares with you directly')).toBeVisible();
  await rahul
    .getByRole('group', { name: 'Where to look' })
    .getByRole('button', { name: 'Groups' })
    .click();
  await expect(holders.getByText('None in your groups.')).toBeVisible();
  await rahul
    .getByRole('group', { name: 'Where to look' })
    .getByRole('button', { name: 'People' })
    .click();
  await expect(holders.getByRole('button', { name: 'Ask Priya' })).toBeVisible();

  // A card she shares with the group: found through the group. His own Atlas is never an answer.
  await rahul.getByRole('button', { name: 'Clear' }).click();
  await rahul.getByRole('searchbox', { name: 'Search for a card' }).fill('millennia');
  await rahul
    .getByRole('option', { name: /Millennia/ })
    .first()
    .click();
  await expect(holders.getByText('Weekend Crew')).toBeVisible();
  await rahul.getByRole('button', { name: 'Clear' }).click();
  await rahul.getByRole('searchbox', { name: 'Search for a card' }).fill('atlas');
  await rahul.getByRole('option', { name: /Atlas/ }).first().click();
  await expect(rahul.getByText('Nobody you know has it')).toBeVisible();

  // --- Or find by perk.
  await rahul.getByRole('button', { name: 'Clear' }).click();
  await rahul
    .getByRole('group', { name: 'Perks' })
    .getByRole('button', { name: 'Cashback' })
    .click();
  const perkCards = rahul.getByRole('list', { name: 'Cards with this perk' });
  await expect(
    perkCards.getByRole('listitem', { name: /Cashback SBI, held by Priya/ }),
  ).toBeVisible();
  await expect(perkCards.getByRole('listitem', { name: /Millennia, held by Priya/ })).toBeVisible();
  await rahul.getByRole('group', { name: 'Perks' }).getByRole('button', { name: 'Fuel' }).click();
  await expect(
    rahul.getByText('Nobody you know has shared a card with that perk yet.'),
  ).toBeVisible();

  // --- Priya stops sharing from My cards; it leaves Rahul's Find.
  await priya.getByRole('switch', { name: 'Visible to Rahul' }).click();
  await expect(priya.getByRole('switch', { name: 'Hidden from Rahul' })).toBeVisible();
  await rahul
    .getByRole('group', { name: 'Perks' })
    .getByRole('button', { name: 'Cashback' })
    .click();
  await expect(perkCards.getByRole('listitem', { name: /Millennia, held by Priya/ })).toBeVisible();
  await expect(perkCards.getByRole('listitem', { name: /Cashback SBI/ })).toHaveCount(0);

  await close();
});

test('with nobody in your groups, sharing with a person explains what to do', async ({
  page,
  request,
}) => {
  await signUp(page, request, 'Solo');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.goto('/share');
  await expect(
    page.getByText('You can share with anyone who is in a group with you.'),
  ).toBeVisible();
});
