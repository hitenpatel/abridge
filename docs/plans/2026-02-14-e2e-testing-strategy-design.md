# E2E Testing Strategy: Unified Mobile + Web

**Date**: 2026-02-14
**Status**: Approved

## Problem

SchoolConnect has growing test coverage but no E2E integration layer. API has 9 unit test files (mocked Prisma), web has 2 tests, mobile has 4 screen tests + 4 local Maestro flows. No tests validate real user journeys end-to-end, no shared test infrastructure exists between platforms, and Playwright (installed) has no config or tests.

## Goals

- Catch regressions across the full stack (API + UI) before merge
- Define test journeys once, run on both web (Playwright) and mobile (Maestro)
- Shared DB seeding so both platforms test against identical data
- Contract testing to catch API changes that break clients
- Full coverage tracking with a test matrix
- Everything runs in GitHub Actions

## Approach: Unified Test Spec Layer

Define user journeys in YAML specs. Generators translate them to platform-specific tests (Playwright for web, Maestro for mobile). Shared fixtures seed the DB. Contract snapshots catch API drift.

## 1. Package Structure

```
packages/
  e2e/                           @schoolconnect/e2e
    journeys/                    shared test specs (YAML)
      auth/
        login-parent.yaml
        login-staff.yaml
        logout.yaml
      messaging/
        view-messages.yaml
        compose-message.yaml
        search-messages.yaml
      attendance/
        view-attendance.yaml
        mark-attendance.yaml
      payments/
        view-payments.yaml
        make-payment.yaml
      forms/
        view-forms.yaml
        submit-form.yaml
      dashboard/
        parent-home.yaml
        staff-home.yaml
    fixtures/
      seed.ts                    shared DB seeding (Prisma)
      factories.ts               createTestParent(), createTestSchool(), etc.
      constants.ts               test credentials, URLs
    generators/
      to-playwright.ts           YAML -> Playwright .spec.ts files
      to-maestro.ts              YAML -> Maestro .yaml flows
    contracts/
      snapshots/                 tRPC response type snapshots
      contract.test.ts           snapshot comparison tests
      snapshot-generator.ts      extracts procedure signatures
    generated/                   output dir (gitignored)
      playwright/
      maestro/
    scripts/
      report-matrix.ts           CLI coverage reporter
    test-matrix.ts               programmatic coverage tracking
    package.json
```

Single package owns all E2E concerns. Generated output is gitignored - YAML specs are the source of truth.

## 2. Journey Spec Format

```yaml
journey:
  id: compose-message
  name: Compose and send a message
  tags: [smoke, messaging]
  role: staff                    # staff | parent
  skipPlatforms: []              # optional: [web] or [mobile]

  preconditions:
    seed: staff-with-school      # fixture name
    state: authenticated         # authenticated | unauthenticated

  steps:
    - action: navigate
      target: messages

    - action: tap
      target: compose-button
      selectors:
        web: "[data-testid='compose-message-btn']"
        mobile: "Compose"        # accessibility label

    - action: fill
      target: subject-field
      selectors:
        web: "[data-testid='message-subject']"
        mobile: "Subject"
      value: "Sports Day Update"

    - action: tap
      target: send-button
      selectors:
        web: "[data-testid='send-btn']"
        mobile: "Send"

  assertions:
    - type: visible
      text: "Message sent"
    - type: navigate-back
      target: messages
    - type: visible
      text: "Sports Day Update"
```

**Actions** (fixed set): `navigate`, `tap`, `fill`, `scroll`, `wait`, `long-press`.

**Assertions**: `visible`, `not-visible`, `count`, `navigate-back`.

**Selectors** are per-platform: web uses `data-testid`, mobile uses accessibility labels. Avoids leaky abstractions.

## 3. Fixtures & Seeding

Factories use Prisma directly for type safety.

```ts
// fixtures/factories.ts
export type FixtureName =
  | "parent-with-school"
  | "staff-with-school"
  | "staff-with-messages"
  | "parent-with-payments";

export async function seedFixture(name: FixtureName) {
  await cleanTestData();  // TRUNCATE CASCADE in dependency order
  switch (name) {
    case "parent-with-school":
      return createParentWithSchool();
    // ...
  }
}
```

**Seeding per platform:**
- Playwright: `globalSetup` calls `seedFixture()`. Individual tests re-seed via API endpoint.
- Maestro: CI curls a test-only API endpoint before running flows.

**Test seed endpoint** (registered only when `NODE_ENV=test`):
```ts
// apps/api/src/router/test.ts
export const testRouter = router({
  seed: publicProcedure
    .input(z.object({ fixture: z.string() }))
    .mutation(async ({ input }) => {
      await seedFixture(input.fixture as FixtureName);
      return { ok: true };
    }),
});
```

Both platforms hit the same PostgreSQL instance in CI for true parity.

## 4. CI Pipeline

Two E2E jobs run in parallel after existing lint/test/build jobs.

### e2e-web job
1. Start PostgreSQL service
2. `pnpm --filter @schoolconnect/e2e generate:playwright`
3. Push DB schema, start API + Web in background
4. Run Playwright (headless Chromium)
5. Upload report artifact on failure

### e2e-mobile job
1. Start PostgreSQL service
2. `pnpm --filter @schoolconnect/e2e generate:maestro`
3. Push DB schema, start API in background
4. Boot Android emulator (`reactivecircus/android-emulator-runner@v2`, API 34)
5. Seed DB via test endpoint
6. Build Expo dev client, run Maestro flows
7. Upload report artifact on failure

### Run strategy

| Trigger | Scope | Tag filter |
|---------|-------|------------|
| Every PR | smoke only | `--tags smoke` |
| Push to main | all journeys | none |
| Nightly cron | all + contracts | none |

**Timing**: Web ~3-4 min, Mobile ~8-12 min. Both parallel, so ~12 min wall time max on PRs.

## 5. Contract Testing

Snapshot-based tRPC contract checks. Zero infrastructure.

```ts
// contracts/snapshot-generator.ts
// Extracts procedure input/output Zod schemas from appRouter
// Serializes to contracts/snapshots/api-contract.json
```

```ts
// contracts/contract.test.ts
// Compares fresh snapshot against committed one:
// - Output shape changed -> FAIL (breaking for clients)
// - Input shape changed -> WARN (may be additive)
// - Procedure removed -> FAIL
// - New procedure -> INFO (prompt to track)
```

Workflow: developer changes a router -> CI contract test fails -> developer updates clients + snapshot, or reverts.

Runs in the existing `test` CI job, before E2E jobs. Fast feedback.

## 6. Test Matrix & Coverage

Programmatic coverage derived from journey specs + generated output.

```
pnpm --filter @schoolconnect/e2e matrix

Journey                    | Web    | Mobile | Tags
---------------------------+--------+--------+----------
Login as parent            | yes    | yes    | smoke, auth
Login as staff             | yes    | yes    | smoke, auth
Compose message            | yes    | yes    | messaging
Mark attendance            | yes    | skip   | attendance
Submit form                | yes    | MISS   | forms

Coverage: Web 10/10 | Mobile 8/10
```

- `skipPlatforms` in specs distinguishes intentional gaps from missing coverage
- `--json` flag for CI to post coverage summary on PRs
- No coverage thresholds initially - visibility first, gates later

## Scripts

```json
{
  "scripts": {
    "generate:playwright": "tsx generators/to-playwright.ts",
    "generate:maestro": "tsx generators/to-maestro.ts",
    "test:web": "playwright test",
    "test:mobile": "maestro test generated/maestro/",
    "contracts:check": "vitest run contracts/",
    "contracts:update": "tsx contracts/snapshot-generator.ts",
    "matrix": "tsx scripts/report-matrix.ts",
    "matrix:ci": "tsx scripts/report-matrix.ts --json"
  }
}
```

## Initial Journey Coverage Plan

**Phase 1 (smoke):** login-parent, login-staff, view-messages, view-attendance, view-payments, parent-home, staff-home (7 journeys)

**Phase 2 (core flows):** compose-message, mark-attendance, make-payment, submit-form, logout, search-messages (6 journeys)

**Phase 3 (edge cases):** payment-history, form-detail, student-profile, calendar views (4+ journeys)
