import { test, expect } from '@playwright/test';
import { login, openNewTransaction, USERS, SEED_PASSWORD } from './support/auth';

/**
 * MODULE 1 - LOCATORS
 * Cypress Real World App (RWA)
 *
 * Practical evidence: four distinct elements located with four different
 * strategies, plus demonstrations of strictness and of first()/nth().
 *
 * Reference: https://playwright.dev/docs/locators
 */

test.describe('Module 1 | Locator strategies', () => {
  /**
   * ELEMENT 1 - Sign In button, located by ROLE.
   *
   * Why this locator: the button carries an implicit ARIA role and its accessible
   * name is the visible label, so getByRole() matches exactly what the user sees
   * and keeps working if the markup or CSS classes change.
   */
  test('E1 | Sign In button located by role', async ({ page }) => {
    await page.goto('/signin');

    const signIn = page.getByRole('button', { name: 'Sign In' });

    await expect(signIn).toBeVisible();

    // Formik runs without validateOnMount, so the untouched form counts as valid
    // and the button starts enabled; validation only runs after the first change.
    await expect(signIn).toBeEnabled();

    // A 3-character password breaks password.min(4) and the button disables itself.
    await page.getByLabel('Password').fill('abc');
    await expect(signIn).toBeDisabled();

    // A valid username and password make the schema valid again.
    await page.getByLabel('Username').fill(USERS.ted.username);
    await page.getByLabel('Password').fill(SEED_PASSWORD);
    await expect(signIn).toBeEnabled();
  });

  /**
   * ELEMENT 2 - Username field, located by LABEL.
   *
   * Why this locator: the field is a Material-UI TextField whose <label> is bound
   * to the <input>, which is exactly how a user identifies the field in a form;
   * getByLabel() is the strategy the documentation recommends for form controls.
   */
  test('E2 | Username field located by label', async ({ page }) => {
    await page.goto('/signin');

    const username = page.getByLabel('Username');

    await expect(username).toBeVisible();
    await expect(username).toBeEmpty();

    await username.fill(USERS.ted.username);
    await expect(username).toHaveValue(USERS.ted.username);
  });

  /**
   * ELEMENT 3 - Amount field, located by PLACEHOLDER.
   *
   * Why this locator: this input has no visible <label>; its placeholder is the
   * only text the user reads to identify it, so getByPlaceholder() is the closest
   * match to the user's perception without falling back to the DOM structure.
   */
  test('E3 | Amount field located by placeholder', async ({ page }) => {
    await login(page, USERS.ted.username, SEED_PASSWORD);

    await openNewTransaction(page, USERS.kristian.id);

    const amount = page.getByPlaceholder('Amount');

    await expect(amount).toBeVisible();
    await expect(amount).toBeEditable();
  });

  /**
   * ELEMENT 4 - Account balance, located by TEST ID.
   *
   * Why this locator: the balance is a plain <h6> with no role and a value that
   * changes on every transaction, so neither role nor text is stable; the
   * data-test attribute is the only identifier the application guarantees.
   */
  test('E4 | Account balance located by test id', async ({ page }) => {
    await login(page, USERS.ted.username, SEED_PASSWORD);

    const balance = page.getByTestId('sidenav-user-balance');

    await expect(balance).toBeVisible();
    await expect(balance).toHaveText(/^\$[\d,]+\.\d{2}$/);
  });

  /**
   * STRICTNESS
   *
   * A Playwright locator is strict: if it resolves to more than one element, the
   * action throws instead of silently acting on the first match. This turns an
   * ambiguous selector into a visible failure rather than a flaky test.
   */
  test('Strictness | an ambiguous locator fails instead of guessing', async ({ page }) => {
    await login(page, USERS.ted.username, SEED_PASSWORD);

    // The public feed renders many transaction items at once.
    const everyTransaction = page.locator('[data-test^="transaction-item-"]');

    // count() is a one-shot read with no auto-waiting, so first wait (web-first)
    // until the feed has rendered at least two items.
    await expect(everyTransaction.nth(1)).toBeVisible();
    expect(await everyTransaction.count()).toBeGreaterThan(1);

    // Acting on the ambiguous locator raises a strict mode violation.
    const failure = await everyTransaction.click({ timeout: 3000 }).catch((error: Error) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('strict mode violation');
  });

  /**
   * first() / nth()
   *
   * These disambiguate a list positionally. They are useful when the elements are
   * genuinely interchangeable (here: "open whichever transaction is on top").
   * The documentation discourages them as a first choice because position is not
   * a property of the element: reordering the feed silently changes the target.
   */
  test('first and nth | positional disambiguation on a list', async ({ page }) => {
    await login(page, USERS.ted.username, SEED_PASSWORD);

    const transactions = page.locator('[data-test^="transaction-item-"]');

    await expect(transactions.first()).toBeVisible();
    await expect(transactions.nth(1)).toBeVisible();

    // Preferred alternative: narrow by content the user can actually read,
    // so the locator keeps pointing at the same thing when the order changes.
    const byContent = transactions.filter({ hasText: 'paid' }).first();
    await expect(byContent).toBeVisible();
  });
});
