## 1. Package Scaffolding

- [x] 1.1 Create `packages/e2e/` package with `package.json` (`@schoolconnect/e2e`), add dependencies: `yaml`, `@playwright/test`, `vitest`, `tsx`, `zod`
- [x] 1.2 Create directory structure: `journeys/`, `fixtures/`, `generators/`, `contracts/snapshots/`, `generated/playwright/`, `generated/maestro/`, `scripts/`
- [x] 1.3 Add `generated/` to `.gitignore`
- [x] 1.4 Add package scripts: `generate:playwright`, `generate:maestro`, `test:web`, `test:mobile`, `contracts:check`, `contracts:update`, `matrix`, `matrix:ci`
- [x] 1.5 Configure Playwright (`playwright.config.ts`) pointing at `generated/playwright/` test dir, base URL `http://localhost:3000`

## 2. Fixtures & Seeding

- [x] 2.1 Create `fixtures/constants.ts` with `TEST_CREDENTIALS` (parent/staff email+password) and `TEST_URLS` (api/web with env overrides)
- [x] 2.2 Create `fixtures/factories.ts` with `FixtureName` type, `cleanTestData()` (truncate in dependency order), and `seedFixture()` dispatcher
- [x] 2.3 Implement `createParentWithSchool()` factory: School + User + Account (hashed password) + Student + ParentStudent
- [x] 2.4 Implement `createStaffWithSchool()` factory: School + User + Account + StaffMember (admin)
- [x] 2.5 Implement `createStaffWithMessages()` factory: staff fixture + 5 Message records
- [x] 2.6 Implement `createParentWithPayments()` factory: parent fixture + 3 Payment requests
- [x] 2.7 Create `apps/api/src/router/test.ts` with `seed` mutation, guarded by `NODE_ENV=test`
- [x] 2.8 Register `testRouter` in `apps/api/src/router/index.ts` conditionally on `NODE_ENV=test`

## 3. Journey Spec Parser

- [x] 3.1 Define TypeScript types for journey spec: `Journey`, `Step`, `Assertion`, `Precondition`, `Action` union
- [x] 3.2 Create YAML spec parser with Zod validation (validates required fields, action set, selector presence)
- [x] 3.3 Create `loadAllJourneys()` function that reads `journeys/` recursively and returns typed journey array with domain metadata from directory path
- [x] 3.4 Add `--tags` filtering logic to journey loader

## 4. Journey Specs (Phase 1 - Smoke)

- [x] 4.1 Write `journeys/auth/login-parent.yaml` (smoke, parent, unauthenticated)
- [x] 4.2 Write `journeys/auth/login-staff.yaml` (smoke, staff, unauthenticated)
- [x] 4.3 Write `journeys/messaging/view-messages.yaml` (smoke, parent, authenticated)
- [x] 4.4 Write `journeys/attendance/view-attendance.yaml` (smoke, parent, authenticated)
- [x] 4.5 Write `journeys/payments/view-payments.yaml` (smoke, parent, authenticated)
- [x] 4.6 Write `journeys/dashboard/parent-home.yaml` (smoke, parent, authenticated)
- [x] 4.7 Write `journeys/dashboard/staff-home.yaml` (smoke, staff, authenticated)

## 5. Playwright Generator

- [x] 5.1 Create `generators/route-map.ts` mapping navigate targets to web URL paths (e.g., `messages` → `/dashboard/messages`)
- [x] 5.2 Create `generators/to-playwright.ts` that loads journeys and writes `.spec.ts` files to `generated/playwright/`
- [x] 5.3 Implement action translators: `navigate` → `page.goto()`, `tap` → `getByTestId().click()`, `fill` → `getByTestId().fill()`, `scroll`, `wait`, `long-press`
- [x] 5.4 Implement assertion translators: `visible` → `expect().toBeVisible()`, `not-visible`, `count`, `navigate-back`
- [x] 5.5 Implement precondition handling: seed fixture via globalSetup, login via stored auth state
- [x] 5.6 Add `--tags` CLI argument support to generator script
- [x] 5.7 Add `data-testid` attributes to key web dashboard components (compose button, send button, subject/body fields, navigation items)

## 6. Maestro Generator

- [x] 6.1 Create `generators/tab-map.ts` mapping navigate targets to mobile tab labels (e.g., `messages` → `Inbox`)
- [x] 6.2 Create `generators/to-maestro.ts` that loads journeys and writes `.yaml` flow files to `generated/maestro/`
- [x] 6.3 Implement action translators: `navigate` → `tapOn` tab, `tap` → `tapOn` accessibility label, `fill` → `tapOn` + `inputText`, `scroll` → `scrollUntilVisible`, `wait` → `waitForAnimationToEnd`
- [x] 6.4 Implement assertion translators: `visible` → `assertVisible`, `not-visible` → `assertNotVisible`
- [x] 6.5 Implement precondition handling: generate pre-seed curl command at flow start, login steps for authenticated flows
- [x] 6.6 Add `--tags` CLI argument support to generator script

## 7. Contract Testing

- [x] 7.1 Create `contracts/snapshot-generator.ts` that extracts tRPC procedure input/output Zod schemas and writes to `contracts/snapshots/api-contract.json`
- [x] 7.2 Create `contracts/contract.test.ts` with Vitest: output changes fail, input changes warn, removed procedures fail, new procedures log
- [x] 7.3 Generate and commit initial `api-contract.json` snapshot

## 8. Test Matrix

- [x] 8.1 Create `test-matrix.ts` with `getTestMatrix()` that loads journey specs and checks generated output existence
- [x] 8.2 Create `scripts/report-matrix.ts` CLI with formatted table output, domain grouping, and coverage summary
- [x] 8.3 Add `--json` flag for CI-parseable output

## 9. CI Pipeline

- [x] 9.1 Add `e2e-web` job to `.github/workflows/ci.yml`: PostgreSQL service, generate Playwright, start API+Web, run tests, upload report on failure
- [x] 9.2 Add `e2e-mobile` job to `.github/workflows/ci.yml`: PostgreSQL service, generate Maestro, start API, Android emulator, Expo build, seed + run flows, upload report on failure
- [x] 9.3 Configure tag filtering: `--tags smoke` on PR events, no filter on push to main
- [x] 9.4 Add nightly cron schedule running full suite + contract checks

## 10. Journey Specs (Phase 2 - Core Flows)

- [x] 10.1 Write `journeys/auth/logout.yaml` (auth, authenticated)
- [x] 10.2 Write `journeys/messaging/compose-message.yaml` (messaging, staff, authenticated)
- [x] 10.3 Write `journeys/messaging/search-messages.yaml` (messaging, authenticated)
- [x] 10.4 Write `journeys/attendance/mark-attendance.yaml` (attendance, staff, authenticated, skipPlatforms: [mobile])
- [x] 10.5 Write `journeys/payments/make-payment.yaml` (payments, parent, authenticated)
- [x] 10.6 Write `journeys/forms/submit-form.yaml` (forms, parent, authenticated)

## 11. Validation & Smoke Test

- [x] 11.1 Run `generate:playwright` and verify generated `.spec.ts` files are valid TypeScript
- [x] 11.2 Run `generate:maestro` and verify generated `.yaml` files pass `maestro validate`
- [x] 11.3 Run `contracts:check` against committed snapshot and verify pass
- [x] 11.4 Run `matrix` and verify all Phase 1 journeys show `covered` on both platforms
- [x] 11.5 Run Playwright tests locally against running API+Web
- [x] 11.6 Run Maestro flows locally against running API+emulator
