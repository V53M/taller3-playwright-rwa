import { Page, expect } from '@playwright/test';

/**
 * Seeded users shipped with the Cypress Real World App (data/database.json).
 * The seed password is the same for every demo user.
 */
export const USERS = {
  ted: { id: 'uBmeaz5pX', username: 'Heath93', fullName: 'Ted Parisian' },
  kristian: { id: 'GjWovtg2hr', username: 'Arvilla_Hegmann', fullName: 'Kristian Bradtke' },
  darrel: { id: '_XblMqbuoP', username: 'Dina20', fullName: 'Darrel Ortiz' },
} as const;

export const SEED_PASSWORD = 's3cret';

/**
 * Logs a seeded user in through the real sign-in form.
 *
 * getByLabel() is used for the two inputs because the RWA renders a Material-UI
 * TextField whose <label> is programmatically bound to the <input>: targeting the
 * accessible name keeps the test tied to what the user reads on screen.
 */
export async function login(page: Page, username: string, password: string = SEED_PASSWORD) {
  await page.goto('/signin');

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // The sign-in form is replaced by the authenticated shell.
  await expect(page.getByTestId('sidenav-username')).toHaveText(`@${username}`);
}

export async function logout(page: Page) {
  await page.getByTestId('sidenav-signout').click();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
}

/**
 * Opens the "new transaction" wizard and selects a recipient, leaving the page
 * on step two (amount + note). Shared by modules 2 to 5.
 */
export async function openNewTransaction(page: Page, recipientId: string) {
  await page.getByTestId('nav-top-new-transaction').click();
  await page.getByTestId(`user-list-item-${recipientId}`).click();
  await expect(page.getByTestId('transaction-create-form')).toBeVisible();
}

/**
 * Reads the balance shown in the side navigation and returns it in cents, so
 * assertions compare exact integers instead of floating point values.
 */
export async function readBalanceInCents(page: Page): Promise<number> {
  const raw = await page.getByTestId('sidenav-user-balance').innerText();
  return Math.round(parseFloat(raw.replace(/[^0-9.]/g, '')) * 100);
}
