# Taller Investigativo - Tercer Corte

Universidad ECCI - Santiago de Cali | Pruebas y Calidad de Software
Docente: Oscar Sarabino (osarabinoa@ecci.edu.co)

Equipo: Sebastian Torres Villaquiran / Victor Manuel Marin Marin

## What this repo is

A fork/clone of the Cypress Real World App (RWA), used as the application under
test. The coursework is about **Playwright**, not Cypress: the existing `cypress/`
folder belongs to the upstream project and is not part of this assignment.

## The assignment

Deliver **one report per team, written in English**, organized by five modules.
It must include: full names, institutional emails, application used, repository
link, research answers, the requested tables/diagrams, code fragments, execution
evidence, and cited sources. Every member must be able to explain orally what a
locator, an action and an assertion do, and how a test case was derived from a
decision table or a state model.

| # | Module | Research | Practical deliverable |
|---|---|---|---|
| 1 | Locators | Matrix of 6 strategies, strictness, `first/last/nth` | 4 elements located with >=3 strategies, must include `getByRole()` and `getByLabel()`/`getByPlaceholder()` |
| 2 | Actions | Table of 7 actions, `fill()` vs `pressSequentially()`, status of `locator.type()`, actionability checks | Short flow with >=4 different actions |
| 3 | Assertions | Table of 12 matchers, web-first vs generic, `.not` and `expect.soft()` | Extend module 2 flow with 4 assertions: state, text/value, page/navigation, negative/generic |
| 4 | Decision tables (ISTQB CTFL 4.0.1) | Limited vs extended entry, meaning of T/F/-/N/A/X, infeasible combinations, 100% coverage | Real business rule + table + ONE parameterized script covering >=3 rules |
| 5 | State transition (ISTQB CTFL 4.0.1) | State, event, transition, guard; state diagram vs state table; all-states / valid-transitions / all-transitions coverage | >=3 states, >=4 valid transitions + 1 invalid, 2 automated cases, coverage calculation |

Official sources to cite: Playwright docs (Locators, Actions/Input,
Auto-waiting/Actionability, Assertions, Locator API) and ISTQB CTFL v4.0.1
sections 4.2.3 and 4.2.4.

## Current status

- [x] Playwright configured (`testIdAttribute: 'data-test'` added to `playwright.config.ts`; backup at `playwright.config.ts.bak`)
- [x] Module 1 - `playwright-tests/taller3/01-locators.spec.ts`
- [x] Module 2 - `playwright-tests/taller3/02-actions.spec.ts`
- [x] Module 3 - `playwright-tests/taller3/03-assertions.spec.ts` (sender Darrel, so it can run in parallel with module 2)
- [x] Module 4 - `playwright-tests/taller3/04-decision-table.spec.ts` (bank account form, 4 collapsed rules = 100%, defect 1 as `test.fail()`)
- [x] Modules 1-4 executed and green on chromium (15/15, branch `taller3/playwright-modules`)
- [ ] Module 5 - state transition
- [ ] Final report in English
- [x] Team repository (see below)

## How to run

Two terminals. The app must be running before Playwright starts.

```
yarn dev                                              # terminal 1 (ports 3000 + 3001)
npx playwright test --project=chromium playwright-tests/taller3   # terminal 2
npx playwright show-report
npx playwright test --project=chromium playwright-tests/taller3 --ui   # good for evidence
```

Use `--project=chromium`. The config also declares firefox and webkit, which
triples run time and adds nothing the assignment asks for.

On a cold start Vite re-optimizes dependencies after the first page load, and pages
loaded during that window render blank (every test fails with "element not found").
Open `http://localhost:3000/signin` once and wait until it renders before the first run.
The API (3001) also takes a minute or two longer than the frontend to start listening.

`yarn dev` **reseeds `data/database.json` on every start.** Anything created by a
previous run disappears. Never restart it in the middle of a chain of dependent
tests.

## Conventions

- New specs live in `playwright-tests/taller3/`, shared helpers in `taller3/support/`.
- Specs for this assignment are written **in English** so they match the report.
  The two older files in `playwright-tests/` (`01-primer-test`, `02-registro-password-bva`)
  are previous class exercises in Spanish. Leave them alone.
- Prefer user-facing locators: `getByRole` > `getByLabel`/`getByPlaceholder` > `getByTestId`.
  Use `getByTestId` only when role and text are unstable, and say why in a comment.
- Every locator and non-obvious action carries a one-line comment justifying it.
  Those comments are the raw material for the report.
- No `waitForTimeout`. Rely on auto-waiting and web-first assertions.

## Seeded users

Password for every demo user: `s3cret`

| id | username | full name | balance (cents) |
|---|---|---|---|
| `uBmeaz5pX` | Heath93 | Ted Parisian | 150953 |
| `GjWovtg2hr` | Arvilla_Hegmann | Kristian Bradtke | 93026 |
| `_XblMqbuoP` | Dina20 | Darrel Ortiz | 158880 |
| `M1ty1gR8B3` | Reyes.Osinski | Ruthie Prosacco | 117683 |
| `WHjJ4qR2R2` | Judah_Dietrich50 | Lia Rosenbaum | 49474 |

Helpers in `playwright-tests/taller3/support/auth.ts`: `USERS`, `SEED_PASSWORD`,
`login()`, `logout()`, `openNewTransaction()`, `readBalanceInCents()`.

## Selector map

| Element | Selector |
|---|---|
| Sign in username / password | `getByLabel('Username')` / `getByLabel('Password')` |
| Sign in submit | `getByRole('button', { name: 'Sign In' })` |
| Remember me | `getByTestId('signin-remember-me')` |
| Sign in error | `getByTestId('signin-error')` |
| Sidenav username / balance | `getByTestId('sidenav-username')` / `getByTestId('sidenav-user-balance')` |
| Sign out | `getByTestId('sidenav-signout')` |
| New transaction (top bar) | `getByTestId('nav-top-new-transaction')` |
| Recipient in list | `getByTestId('user-list-item-<userId>')` |
| Amount / note | `getByPlaceholder('Amount')` / `getByPlaceholder('Add a note')` |
| Pay / Request | `getByTestId('transaction-create-submit-payment')` / `...-submit-request` |
| Feed tabs | `getByTestId('nav-public-tab' \| 'nav-contacts-tab' \| 'nav-personal-tab')` |
| Transaction item | `[data-test^="transaction-item-"]` |
| Bank account form / submit | `getByTestId('bankaccount-form')` / `getByTestId('bankaccount-submit')` |

## Application logic worth knowing

Findings from the previous assignment, verified against the source. Useful raw
material for modules 4 and 5.

**Validation schemas**
- `src/components/SignInForm.tsx` - password `min(4)`.
- `src/components/BankAccountForm.tsx` - `bankName.min(5)`, `routingNumber.length(9)`,
  `accountNumber.min(9).max(12)`. Length only: **no numeric format check**.
- `src/components/TransactionCreateStepTwo.tsx` - `amount: number().required()`,
  `description: string().required()`, `validateOnMount`, buttons use
  `disabled={!isValid || isSubmitting}`.

**Backend** (`backend/database.ts`)
- `createTransaction` (~line 524): branches on `if (isPayment(transaction))`. Payment
  debits/credits and sets `status: complete`; request sets `requestStatus: pending`
  and moves no money.
- `updateTransactionById` (~line 578): branches on `if (isRequestTransaction(transaction))`,
  which tests the **type** of the transaction, not the status being saved.
- `transactionsWithinAmountRange` (~line 402): guard `if (!amountMin || !amountMax)
  return transactions;` then `inRange(amountMin, amountMax, amount)` from `lodash/fp`
  (**upper bound exclusive**). Query params arrive as strings, so `amountMin` of 0
  arrives as `"0"` (truthy) and the guard does not fire.
- `ensureAuthenticated` (`backend/helpers.ts` ~line 98): `if (req.isAuthenticated())
  return next();` else `res.status(401)`.

**Confirmed defects** (documented with evidence in the previous deliverable)
1. Routing Number accepts `ABCDEFGHI` - validated by length only, account is created.
2. A transaction with amount `0` is accepted and stored, with no error shown.
3. No funds check: a payment larger than the balance goes through and leaves it at 0.
4. **REJECT REQUEST transfers the money exactly like accepting it**, because
   `updateTransactionById` branches on transaction type rather than target status.

## Suggested material for the pending modules

**Module 4 (decision table).** The bank account form is a clean limited-entry table:
three conditions (bankName >= 5, routingNumber length == 9, accountNumber 9..12)
over one action (SAVE enabled / account created) gives 8 rules, several of which
collapse. Defect 1 above shows up as a rule the implementation gets wrong.
Alternative: amount valid + note present -> PAY enabled, which ties into defect 2.

**Module 5 (state transition).** The money request lifecycle: `pending ->
accepted` / `pending -> rejected`, plus `accepted -> accepted` as the invalid
transition worth attempting (defect 4 lives exactly there). Three states, four
valid transitions and one invalid are reachable through the UI.

## Repository

- `origin`: https://github.com/V53M/taller3-playwright-rwa (team repo, owner V53M)
- `upstream`: https://github.com/cypress-io/cypress-realworld-app (read-only reference)
- Work branch: `taller3/playwright-modules`. `develop` is the untouched upstream base.
- Commits use the repo-local identity `Victor Marin <286382582+V53M@users.noreply.github.com>`.

Intentionally never committed: `data/database.json` (reseeded on every `yarn dev`),
`playwright.config.ts.bak`, and the `tests/example.spec.ts` scaffold.
