import { test, expect, Page } from '@playwright/test';
import { login, USERS } from './support/auth';

/**
 * MODULE 4 - DECISION TABLE TESTING (ISTQB CTFL v4.0.1, section 4.2.3)
 * Cypress Real World App (RWA)
 *
 * Business rule: a user can save a new bank account only when the bank name has
 * at least 5 characters, the routing number has exactly 9 characters and the
 * account number has between 9 and 12 characters.
 * Source: validationSchema in src/components/BankAccountForm.tsx.
 *
 * Conditions (limited entry, T/F):
 *   C1  bankName length >= 5
 *   C2  routingNumber length == 9
 *   C3  accountNumber length in 9..12
 * Actions:
 *   A1  Save button enabled
 *   A2  account created and listed
 *   A3  validation message shown for the first failing field
 *
 * Full table (2^3 = 8 rules):
 *
 *   | Rule        | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
 *   |-------------|---|---|---|---|---|---|---|---|
 *   | C1 name     | T | T | T | T | F | F | F | F |
 *   | C2 routing  | T | T | F | F | T | T | F | F |
 *   | C3 account  | T | F | T | F | T | F | T | F |
 *   | A1 Save on  | X |   |   |   |   |   |   |   |
 *   | A2 created  | X |   |   |   |   |   |   |   |
 *   | A3 message  |   | X | X | X | X | X | X | X |
 *
 * Collapsed table: when C1 is F the outcome is the same whatever C2 and C3 are,
 * so rules 5-8 merge into one rule with "-" (don't care); rules 3-4 merge the
 * same way on C3. The collapsed table keeps 4 rules that cover all 8 cases:
 *
 *   | Rule        | R1 | R2 | R3 | R4 |
 *   |-------------|----|----|----|----|
 *   | C1 name     | T  | F  | T  | T  |
 *   | C2 routing  | T  | -  | F  | T  |
 *   | C3 account  | T  | -  | -  | F  |
 *   | A1 Save on  | X  |    |    |    |
 *   | A2 created  | X  |    |    |    |
 *   | A3 message  |    | X  | X  | X  |
 *
 * Coverage: the parameterized test below exercises R1-R4, so decision table
 * coverage is 4/4 = 100% of the collapsed rules. R4 runs twice, once on each
 * side of the 9..12 range, because "F" for C3 hides two different boundaries.
 * For "-" conditions a valid value is chosen, so each failing case has exactly
 * one cause.
 *
 * Reference: ISTQB CTFL Syllabus v4.0.1, 4.2.3 Decision Table Testing
 */

type Rule = {
  id: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  saveEnabled: boolean;
  message?: string; // A3: expected validation message when the rule rejects
};

// Created accounts stay in the database until `yarn dev` restarts, so the valid
// bank name carries a per-run suffix to find this run's account in the list.
const VALID_NAME = `Taller Bank ${Date.now()}`;
const VALID_ROUTING = '123456789'; // exactly 9
const VALID_ACCOUNT = '123456789'; // lower bound of 9..12

const RULES: Rule[] = [
  {
    id: 'R1 | T T T -> saved',
    bankName: VALID_NAME,
    routingNumber: VALID_ROUTING,
    accountNumber: VALID_ACCOUNT,
    saveEnabled: true,
  },
  {
    id: 'R2 | F - - -> rejected on bank name',
    bankName: 'Bank', // 4 characters, one below the minimum
    routingNumber: VALID_ROUTING,
    accountNumber: VALID_ACCOUNT,
    saveEnabled: false,
    message: 'Must contain at least 5 characters',
  },
  {
    id: 'R3 | T F - -> rejected on routing number',
    bankName: VALID_NAME,
    routingNumber: '12345678', // 8 characters, one below the exact length
    accountNumber: VALID_ACCOUNT,
    saveEnabled: false,
    message: 'Must contain a valid routing number',
  },
  {
    id: 'R4 | T T F -> rejected, account too short',
    bankName: VALID_NAME,
    routingNumber: VALID_ROUTING,
    accountNumber: '12345678', // 8, one below the range
    saveEnabled: false,
    message: 'Must contain at least 9 digits',
  },
  {
    id: 'R4 | T T F -> rejected, account too long',
    bankName: VALID_NAME,
    routingNumber: VALID_ROUTING,
    accountNumber: '1234567890123', // 13, one above the range
    saveEnabled: false,
    message: 'Must contain no more than 12 digits',
  },
];

/** Opens the new bank account form through the side navigation. */
async function openBankAccountForm(page: Page) {
  await login(page, USERS.kristian.username);

  // Sidenav entry and Create button are both router <a> elements, hence role link.
  await page.getByRole('link', { name: 'Bank Accounts' }).click();
  await page.getByRole('link', { name: 'Create', exact: true }).click();
  await expect(page.getByTestId('bankaccount-form')).toBeVisible();
}

/** Fills the three fields; placeholders are the only visible text they carry. */
async function fillBankAccount(page: Page, rule: Pick<Rule, 'bankName' | 'routingNumber' | 'accountNumber'>) {
  await page.getByPlaceholder('Bank Name').fill(rule.bankName);
  await page.getByPlaceholder('Routing Number').fill(rule.routingNumber);
  await page.getByPlaceholder('Account Number').fill(rule.accountNumber);
}

test.describe('Module 4 | Decision table: new bank account form', () => {
  // One test per rule, generated from the table above.
  for (const rule of RULES) {
    test(rule.id, async ({ page }) => {
      await openBankAccountForm(page);
      await fillBankAccount(page, rule);

      // Located by role: the visible label "Save" is stable.
      const save = page.getByRole('button', { name: 'Save' });

      if (rule.saveEnabled) {
        // A1 + A2: Save is enabled and the account appears in the list.
        await expect(save).toBeEnabled();
        await save.click();

        await expect(page).toHaveURL(/\/bankaccounts$/);
        await expect(page.getByTestId('bankaccount-list').getByText(rule.bankName)).toBeVisible();
      } else {
        // A3: Save stays disabled, the field explains why, and nothing navigates.
        await expect(save).toBeDisabled();
        await expect(page.getByText(rule.message!)).toBeVisible();
        await expect(page).toHaveURL(/\/bankaccounts\/new$/);
      }
    });
  }

  /**
   * KNOWN DEFECT 1 - the routing number is validated by length only.
   *
   * Under the real business rule a routing number is 9 digits, so "ABCDEFGHI"
   * should make C2 false and Save should stay disabled. The implementation only
   * checks length, treats C2 as true and saves the account: this rule's
   * expected result and actual result disagree.
   *
   * test.fail() marks the test as expected to fail: it is reported as passing
   * while the defect exists, and turns red as soon as someone fixes it, which
   * is the signal to remove the annotation.
   */
  test.fail('Defect 1 | alphabetic routing number should be rejected', async ({ page }) => {
    await openBankAccountForm(page);
    await fillBankAccount(page, {
      bankName: `Defect Bank ${Date.now()}`,
      routingNumber: 'ABCDEFGHI', // 9 characters, but not a number
      accountNumber: VALID_ACCOUNT,
    });

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled({ timeout: 3000 });
  });
});
