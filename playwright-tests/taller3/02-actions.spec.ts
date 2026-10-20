import { test, expect } from '@playwright/test';
import { USERS, SEED_PASSWORD, openNewTransaction, readBalanceInCents } from './support/auth';

/**
 * MODULE 2 - ACTIONS
 * Cypress Real World App (RWA)
 *
 * A short end-to-end flow (sign in -> send money) driven with five different
 * actions: fill(), setChecked(), press(), click() and hover().
 *
 * Before every action Playwright runs its actionability checks on the element,
 * so no explicit wait or sleep appears anywhere in this file.
 *
 * Reference: https://playwright.dev/docs/input
 *            https://playwright.dev/docs/actionability
 */

test.describe('Module 2 | Actions on a real flow', () => {
  test('Send money using five different actions', async ({ page }) => {
    // ---------------------------------------------------------------- ACTION 1
    // fill(): clears the field and sets the value in a single operation, firing
    // one input event. It is the right choice here because the sign-in form only
    // reads the final value; nothing depends on the individual keystrokes.
    await page.goto('/signin');
    await page.getByLabel('Username').fill(USERS.ted.username);
    await page.getByLabel('Password').fill(SEED_PASSWORD);

    // ---------------------------------------------------------------- ACTION 2
    // setChecked(): states the intended final state instead of toggling blindly,
    // so re-running the test cannot leave the checkbox in the opposite state.
    const rememberMe = page.getByTestId('signin-remember-me');
    await rememberMe.setChecked(true);
    await expect(rememberMe).toBeChecked();

    // ---------------------------------------------------------------- ACTION 3
    // press(): sends a single key to the focused element. Submitting the form with
    // Enter exercises the same path a keyboard user takes, which a click does not.
    await page.getByLabel('Password').press('Enter');
    await expect(page.getByTestId('sidenav-username')).toHaveText(`@${USERS.ted.username}`);

    const balanceBefore = await readBalanceInCents(page);

    // ---------------------------------------------------------------- ACTION 4
    // click(): before clicking, Playwright waits for the element to be visible,
    // stable, able to receive events and enabled.
    await openNewTransaction(page, USERS.kristian.id);

    await page.getByPlaceholder('Amount').fill('25');
    await page.getByPlaceholder('Add a note').fill('Module 2 - actions demo');
    await page.getByTestId('transaction-create-submit-payment').click();

    // Step three replaces the form with a confirmation and no feed tabs. It looks
    // like a button but is an MUI Button rendered as a router <a>, so its ARIA
    // role is "link": getByRole() follows the accessibility tree, not the styling.
    await page.getByRole('link', { name: 'Return To Transactions' }).click();

    // ---------------------------------------------------------------- ACTION 5
    // hover(): moves the pointer without clicking. Used here to bring the new
    // transaction under the cursor the way a user inspecting the feed would.
    await page.getByTestId('nav-personal-tab').click();
    // Filtered by the note just typed rather than by position, so the locator
    // still points at this payment if the feed order changes.
    const newest = page
      .locator('[data-test^="transaction-item-"]')
      .filter({ hasText: 'Module 2 - actions demo' })
      .first();
    await newest.hover();
    await expect(newest).toContainText('Module 2 - actions demo');

    // The payment left the sender 25.00 poorer.
    const balanceAfter = await readBalanceInCents(page);
    expect(balanceBefore - balanceAfter).toBe(2500);
  });

  /**
   * pressSequentially(): the only place in this flow where character-by-character
   * typing is justified.
   *
   * The Amount field is wrapped in react-number-format with thousandSeparator and
   * a "$" prefix, so the mask rewrites the input on every keystroke. fill() sets
   * the value in one shot and bypasses that per-character formatting;
   * pressSequentially() reproduces real typing and therefore actually exercises
   * the mask. For every other field in this application fill() is correct and
   * faster, which is why the documentation recommends it by default.
   */
  test('pressSequentially exercises the amount mask that fill bypasses', async ({ page }) => {
    await page.goto('/signin');
    await page.getByLabel('Username').fill(USERS.ted.username);
    await page.getByLabel('Password').fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByTestId('sidenav-username')).toHaveText(`@${USERS.ted.username}`);

    await openNewTransaction(page, USERS.kristian.id);

    const amount = page.getByPlaceholder('Amount');
    await amount.pressSequentially('1234', { delay: 50 });

    // The mask formatted the value as it was typed.
    await expect(amount).toHaveValue('$1,234');
  });
});
