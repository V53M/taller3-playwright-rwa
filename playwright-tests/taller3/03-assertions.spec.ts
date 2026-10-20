import { test, expect } from '@playwright/test';
import { login, openNewTransaction, readBalanceInCents, USERS } from './support/auth';

/**
 * MODULE 3 - ASSERTIONS
 * Cypress Real World App (RWA)
 *
 * The module 2 flow (sign in -> send money) extended with the four required
 * kinds of assertion:
 *   A1 state             - toBeDisabled() / toBeEnabled()
 *   A2 text / value      - toHaveValue() / toHaveText()
 *   A3 page / navigation - toHaveURL()
 *   A4 negative/generic  - .not.toHaveText(), toBeHidden(), expect(...).toBe()
 *
 * Web-first assertions (expect(locator)...) retry until the condition holds or
 * the timeout expires. Generic assertions (expect(value)...) check a value once,
 * so they only run after a web-first assertion has proved the page is ready.
 *
 * The sender is Darrel, not Ted: module 2 pays from Ted, and with fullyParallel
 * two payments from one account at the same time would corrupt the balance check.
 *
 * Reference: https://playwright.dev/docs/test-assertions
 */

// The database only reseeds when `yarn dev` restarts, so payments from earlier
// runs stay in the feed; a per-run suffix keeps the note unique.
const NOTE = `Module 3 - assertions demo ${Date.now()}`;

test.describe('Module 3 | Assertions on the send money flow', () => {
  test('Send money and verify state, value, navigation and balance', async ({ page }) => {
    await login(page, USERS.darrel.username);

    // Read once, before any money moves; compared later with a generic assertion.
    const balance = page.getByTestId('sidenav-user-balance');
    const balanceTextBefore = await balance.innerText();
    const balanceBefore = await readBalanceInCents(page);

    await openNewTransaction(page, USERS.kristian.id);

    const amount = page.getByPlaceholder('Amount');
    const note = page.getByPlaceholder('Add a note');
    const pay = page.getByTestId('transaction-create-submit-payment');

    // ------------------------------------------------------------ A1 | STATE
    // The step-two form uses validateOnMount, so an empty form is invalid and
    // Pay starts disabled; it only enables once amount and note are both present.
    await expect(pay).toBeDisabled();

    await amount.fill('25');
    await expect(pay).toBeDisabled(); // note still missing

    await note.fill(NOTE);
    await expect(pay).toBeEnabled();

    // ------------------------------------------------------- A2 | TEXT / VALUE
    // toHaveValue() reads the input's value: react-number-format has rewritten
    // the typed "25" with its "$" prefix.
    await expect(amount).toHaveValue('$25');

    await pay.click();

    // toHaveText() on the confirmation heading proves the server stored what was
    // sent; the heading is located by role because its text is what the user reads.
    await expect(page.getByRole('heading', { level: 2, name: /^Paid/ })).toHaveText(
      `Paid $25.00 for ${NOTE}`
    );

    // ------------------------------------------------- A3 | PAGE / NAVIGATION
    // "Return To Transactions" is a router <a>, so its role is link (see module 2).
    await page.getByRole('link', { name: 'Return To Transactions' }).click();
    await expect(page).toHaveURL('/');

    await page.getByTestId('nav-personal-tab').click();
    await expect(page).toHaveURL(/\/personal$/);

    // Soft assertion: a failure is recorded but the test keeps going, so one run
    // reports every broken check instead of stopping at the first.
    const payment = page
      .locator('[data-test^="transaction-item-"]')
      .filter({ hasText: NOTE });
    await expect.soft(payment).toHaveCount(1);

    // --------------------------------------------- A4 | NEGATIVE AND GENERIC
    // Negative, web-first: the wizard is gone from the page after navigating away.
    await expect(page.getByTestId('transaction-create-form')).toBeHidden();

    // Negative with .not, web-first: retries until the side navigation has
    // re-rendered with the new balance, which makes the next read safe.
    await expect(balance).not.toHaveText(balanceTextBefore);

    // Generic: a plain value checked once, with no retry. Exact integer cents
    // avoid floating point rounding.
    const balanceAfter = await readBalanceInCents(page);
    expect(balanceBefore - balanceAfter).toBe(2500);
  });
});
