import { test, expect, Page } from '@playwright/test';
import { login, logout, openNewTransaction, readServerBalanceInCents, USERS } from './support/auth';

/**
 * MODULE 5 - STATE TRANSITION TESTING (ISTQB CTFL v4.0.1, section 4.2.4)
 * Cypress Real World App (RWA)
 *
 * Object under test: the lifecycle of a money request. Ruthie (requester) asks
 * Lia (receiver) for money; Lia accepts or rejects it.
 * Sources: TransactionCreateStepTwo.tsx, TransactionDetail.tsx,
 *          backend/database.ts (createTransaction, updateTransactionById).
 *
 * States
 *   S0 Idle      no request exists yet (initial state)
 *   S1 Draft     request form open, contact selected, nothing sent
 *   S2 Pending   request stored, requestStatus = pending
 *   S3 Accepted  requestStatus = accepted, money moved (final)
 *   S4 Rejected  requestStatus = rejected (final)
 *
 * Events, guards and valid transitions
 *   T1  S0 --E1 select contact-------------------------------> S1
 *   T2  S1 --E2 submit request [amount and note valid]--------> S2
 *   T3  S2 --E3 accept         [current user is the receiver]-> S3
 *   T4  S2 --E4 reject         [current user is the receiver]-> S4
 *
 * State diagram
 *
 *            E1               E2 [form valid]          E3 [receiver]
 *   (S0) ---------> (S1) ----------------> (S2) ------------------> ((S3))
 *   Idle            Draft                 Pending                   Accepted
 *                                            |
 *                                            |  E4 [receiver]
 *                                            +------------------> ((S4))
 *                                                                 Rejected
 *
 * State table (rows = current state, columns = event; "-" = invalid)
 *
 *   | State       | E1 select | E2 submit     | E3 accept     | E4 reject     |
 *   |-------------|-----------|---------------|---------------|---------------|
 *   | S0 Idle     | S1 (T1)   | -             | -             | -             |
 *   | S1 Draft    | -         | S2 (T2) [g]   | -             | -             |
 *   | S2 Pending  | -         | -             | S3 (T3) [g]   | S4 (T4) [g]   |
 *   | S3 Accepted | -         | -             | - (I1)        | -             |
 *   | S4 Rejected | -         | -             | -             | -             |
 *
 *   5 states x 4 events = 20 cells: 4 valid transitions, 16 invalid.
 *   I1 (accept an already accepted request) is the invalid transition attempted
 *   explicitly: through the UI (no button is offered) and through the API.
 *
 * Coverage
 *   Case 1 path: S0 -T1-> S1 -T2-> S2 -T3-> S3
 *   Case 2 path: S0 -T1-> S1 -T2-> S2 -T4-> S4
 *   All states:        {S0, S1, S2, S3, S4} visited      = 5/5  = 100%
 *   Valid transitions: {T1, T2, T3, T4} exercised        = 4/4  = 100%
 *   All transitions:   4 valid + 4 invalid cells checked
 *                      (S3 x E3, S3 x E4, S4 x E3, S4 x E4) = 8/20 = 40%
 *   Both guards are also checked on their false side: Request stays disabled
 *   while the form is invalid (case 1), and the requester sees no Accept or
 *   Reject button on a pending request (case 2).
 *
 * The tests in this file share Ruthie and Lia and compare Lia's balance, so the
 * file runs in order on one worker instead of fully parallel. No other module
 * uses these two users.
 *
 * Reference: ISTQB CTFL Syllabus v4.0.1, 4.2.4 State Transition Testing
 */

test.describe.configure({ mode: 'default' });

const AMOUNT_CENTS = 1000; // $10.00
const API = 'http://localhost:3001';

/** A note unique to this run: the database keeps requests from earlier runs. */
function uniqueNote(label: string) {
  return `Module 5 - ${label} ${Date.now()}`;
}

/**
 * T1 + T2: Ruthie selects Lia (S0 -> S1) and submits a request (S1 -> S2).
 * Also checks the false side of T2's guard: Request is disabled while the form
 * is invalid, so the event cannot fire and the object stays in Draft.
 */
async function createPendingRequest(page: Page, note: string) {
  await login(page, USERS.ruthie.username);

  // T1: S0 Idle -> S1 Draft
  await openNewTransaction(page, USERS.lia.id);
  const request = page.getByTestId('transaction-create-submit-request');

  // Guard [amount and note valid] is false: E2 is not available, still S1.
  await expect(request).toBeDisabled();

  await page.getByPlaceholder('Amount').fill(String(AMOUNT_CENTS / 100));
  await page.getByPlaceholder('Add a note').fill(note);
  await expect(request).toBeEnabled(); // guard now true

  // T2: S1 Draft -> S2 Pending
  await request.click();
  await expect(page.getByRole('heading', { level: 2, name: /^Requested/ })).toHaveText(
    `Requested $10.00 for ${note}`
  );
}

/** Opens a transaction from the signed-in user's personal feed; returns its id. */
async function openFromPersonalFeed(page: Page, note: string): Promise<string> {
  await page.goto('/personal');
  await page.locator('[data-test^="transaction-item-"]').filter({ hasText: note }).click();
  await expect(page).toHaveURL(/\/transaction\/[^/]+$/);
  return page.url().split('/').pop()!;
}

/** Signs Lia in and opens the pending request addressed to her. */
async function openAsReceiver(page: Page, note: string): Promise<string> {
  await logout(page);
  await login(page, USERS.lia.username);
  return openFromPersonalFeed(page, note);
}

test.describe('Module 5 | State transition: money request lifecycle', () => {
  test('Case 1 | S0 -> S1 -> S2 -> S3: request accepted, then accept again is not offered', async ({ page }) => {
    const note = uniqueNote('accept');
    await createPendingRequest(page, note); // T1, T2
    const id = await openAsReceiver(page, note);

    // In S2 the receiver is offered both events (role button, stable labels).
    const accept = page.getByRole('button', { name: 'Accept Request' });
    const reject = page.getByRole('button', { name: 'Reject Request' });
    await expect(accept).toBeVisible();
    await expect(reject).toBeVisible();

    // Balance read from the server: the side navigation is cached in
    // localStorage and does not reflect this transition (see support/auth.ts).
    const balanceBefore = await readServerBalanceInCents(page);

    // T3: S2 Pending -> S3 Accepted
    await accept.click();

    // S3 is observable: the title verb changes from "requested" to "charged".
    await expect(page.getByTestId(`transaction-action-${id}`)).toHaveText('charged');

    // Invalid transitions S3 x E3 (I1) and S3 x E4: neither event is offered.
    await expect(accept).toBeHidden();
    await expect(reject).toBeHidden();

    // The transition's action: Lia paid exactly $10.00.
    const balanceAfter = await readServerBalanceInCents(page);
    expect(balanceBefore - balanceAfter).toBe(AMOUNT_CENTS);
  });

  test('Case 2 | S0 -> S1 -> S2 -> S4: request rejected, no further events offered', async ({ page }) => {
    const note = uniqueNote('reject');
    await createPendingRequest(page, note); // T1, T2

    // Guard [current user is the receiver] is false for the requester: even in
    // S2, Ruthie is offered neither Accept nor Reject.
    await openFromPersonalFeed(page, note);
    await expect(page.getByRole('button', { name: 'Accept Request' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Reject Request' })).toBeHidden();

    const id = await openAsReceiver(page, note);
    const accept = page.getByRole('button', { name: 'Accept Request' });
    const reject = page.getByRole('button', { name: 'Reject Request' });

    // T4: S2 Pending -> S4 Rejected
    await reject.click();

    // Invalid transitions S4 x E3 and S4 x E4: neither event is offered.
    await expect(accept).toBeHidden();
    await expect(reject).toBeHidden();

    // Unlike S3, a rejected request keeps the "requested" verb.
    await expect(page.getByTestId(`transaction-action-${id}`)).toHaveText('requested');
  });

  /**
   * KNOWN DEFECT 4 - rejecting a request moves the money anyway.
   *
   * T4 should change only the status. updateTransactionById() branches on the
   * transaction TYPE (is it a request?) instead of the target status, so a
   * rejection debits the receiver exactly like an acceptance. test.fail()
   * reports this as passing while the defect exists.
   */
  test.fail('Defect 4 | rejecting a request must not change the balance', async ({ page }) => {
    const note = uniqueNote('defect 4');
    await createPendingRequest(page, note);
    await openAsReceiver(page, note);

    const balanceBefore = await readServerBalanceInCents(page);

    await page.getByRole('button', { name: 'Reject Request' }).click();
    await expect(page.getByRole('button', { name: 'Reject Request' })).toBeHidden(); // now S4

    expect(await readServerBalanceInCents(page)).toBe(balanceBefore);
  });

  /**
   * INVALID TRANSITION I1 THROUGH THE API - accept an already accepted request.
   * (Defect 5, found while writing this module.)
   *
   * The UI hides the event in S3 (case 1), but the backend has no state guard:
   * PATCH /transactions/:id accepts any requestStatus and moves the money again.
   * Expected: the request is refused and the balance does not change.
   * page.request shares the browser's session cookie, so the call is made as Lia.
   */
  test.fail('I1 via API | accepting an accepted request must be refused', async ({ page }) => {
    const note = uniqueNote('invalid I1');
    await createPendingRequest(page, note);
    const id = await openAsReceiver(page, note);

    await page.getByRole('button', { name: 'Accept Request' }).click();
    await expect(page.getByTestId(`transaction-action-${id}`)).toHaveText('charged'); // now S3

    const balanceInS3 = await readServerBalanceInCents(page);

    // Fire E3 again while in S3.
    const response = await page.request.patch(`${API}/transactions/${id}`, {
      data: { requestStatus: 'accepted' },
    });

    // Soft: record the wrong status code but still check whether money moved.
    expect.soft(response.status(), 'an invalid transition should be refused').toBeGreaterThanOrEqual(400);
    expect(await readServerBalanceInCents(page), 'no money should move twice').toBe(balanceInS3);
  });
});
