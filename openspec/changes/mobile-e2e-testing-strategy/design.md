## Context

SchoolConnect is a monorepo with three apps (API/Fastify+tRPC, Web/Next.js, Mobile/Expo) sharing a Prisma+PostgreSQL data layer. Current testing is unit-level only: API mocks Prisma, web has 2 tests, mobile has 4 screen tests. Playwright is installed but unconfigured. Four Maestro flows exist locally but aren't in CI. No test validates a real user journey across the stack.

Both platforms implement the same user journeys (login, messaging, attendance, payments, forms) against the same tRPC API. Test logic is duplicated or missing entirely.

## Goals / Non-Goals

**Goals:**
- Define each user journey once, test it on both web and mobile
- Shared DB fixtures so both platforms test against identical state
- Catch API contract drift before it reaches E2E
- Run E2E in GitHub Actions on every PR (smoke) and on main (full)
- Track coverage parity across platforms with a test matrix

**Non-Goals:**
- Visual regression testing (screenshots, pixel diffs)
- Performance/load testing
- iOS E2E in CI (Android emulator only; iOS is local-only for now)
- Replacing existing unit/component tests
- Testing third-party integrations (Stripe webhooks, push notifications)

## Decisions

### 1. Single `packages/e2e` package over distributed test dirs

**Choice**: All E2E concerns live in one package rather than spreading tests across `apps/web/e2e/` and `apps/mobile/.maestro/`.

**Why**: Journey specs reference both platforms. Generators, fixtures, and the test matrix need a shared home. A single package avoids cross-package imports and keeps the dependency graph simple.

**Alternative considered**: Tests co-located with each app. Rejected because shared specs would need to live somewhere anyway, and co-location fragments the fixture layer.

### 2. YAML journey specs with per-platform selectors

**Choice**: Each journey is a YAML file with a fixed action set (`navigate`, `tap`, `fill`, `scroll`, `wait`, `long-press`) and per-platform selectors (web: `data-testid`, mobile: accessibility label).

**Why**: YAML is readable and diffable. Per-platform selectors avoid a leaky abstraction — web and mobile selection strategies are fundamentally different. A small, fixed action set covers ~95% of E2E interactions without becoming a DSL maintenance burden.

**Alternative considered**: Shared selector abstraction (single selector per element). Rejected because mobile accessibility labels and web test IDs diverge too often, and the abstraction would require a mapping layer that adds complexity without reducing test count.

### 3. Generators produce gitignored output

**Choice**: `to-playwright.ts` and `to-maestro.ts` generate test files into `generated/` (gitignored). Source of truth is always the YAML specs.

**Why**: Generated files are derived artifacts. Committing them creates merge conflicts and drift. Generating fresh in CI ensures specs and tests are always in sync.

**Alternative considered**: Committing generated files for easier local debugging. Rejected because `pnpm generate:playwright` is fast enough to run locally, and gitignoring avoids stale output.

### 4. Prisma factories with test-only API seed endpoint

**Choice**: Fixtures use Prisma directly (type-safe, same ORM as the app). A `POST /api/test/seed` endpoint is registered only when `NODE_ENV=test` so Maestro (which can't call TypeScript) can trigger seeding via HTTP.

**Why**: Prisma factories get compile-time safety and stay in sync with schema changes. The HTTP endpoint bridges the gap for Maestro without exposing seeding in production.

**Alternative considered**: SQL dump files for seeding. Rejected because they break on schema changes and aren't type-safe. Also considered a separate seed CLI script, but Maestro flows can't invoke CLI commands mid-run.

### 5. tRPC snapshot-based contract testing

**Choice**: Extract procedure input/output Zod schemas into a JSON snapshot. Output shape changes fail the test (breaking for clients). Input shape changes warn (may be additive). New procedures are flagged but don't fail.

**Why**: Lightweight, zero-infrastructure approach that catches the most common API regression (changing a response shape). Runs in the existing `test` CI job, giving faster feedback than waiting for E2E.

**Alternative considered**: Pact or similar contract testing framework. Rejected as overkill for a single-team monorepo where all consumers are co-located. Snapshot comparison achieves the same goal with no external dependencies.

### 6. Android emulator on ubuntu-latest for mobile CI

**Choice**: Use `reactivecircus/android-emulator-runner@v2` on ubuntu runners rather than macOS.

**Why**: Ubuntu runners are free (included in GH Actions minutes). macOS runners cost 10x. Android emulator works on Linux with KVM acceleration. iOS testing is explicitly a non-goal for CI.

**Alternative considered**: Maestro Cloud for device-farm testing. Rejected to keep everything in GH Actions as requested. Can be added later if Android emulator proves flaky.

### 7. Smoke/full tag strategy for CI run times

**Choice**: PR checks run only `smoke`-tagged journeys (~7 flows). Full suite runs on push to main and nightly cron.

**Why**: Mobile E2E with emulator boot + Expo build takes ~8-12 min. Running all journeys on every PR would slow developer feedback. Smoke tests cover login + core navigation + one flow per domain, catching most regressions in ~4-5 min.

## Risks / Trade-offs

**Generator maintenance** — Custom YAML→Playwright/Maestro generators are code we own. If either platform's API changes significantly, generators need updating.
→ Mitigation: Action set is intentionally minimal (6 actions). Generators are thin translators, not a framework. Pin Playwright and Maestro versions.

**Android emulator flakiness in CI** — Emulators on shared CI runners can be slow to boot or flaky under load.
→ Mitigation: Use API level 34 with x86_64 (fast), add retry logic to Maestro runs, keep smoke suite small. Fall back to Maestro Cloud if flakiness exceeds 5% failure rate.

**YAML spec drift from actual UI** — Selectors in YAML can go stale if someone changes a `data-testid` or accessibility label without updating the spec.
→ Mitigation: E2E failures in CI surface this immediately. Selector constants could be extracted to a shared file later if drift becomes frequent.

**Test seed endpoint security** — Exposing a DB-wiping endpoint, even behind `NODE_ENV=test`.
→ Mitigation: Guard with both `NODE_ENV` check and a test-only API key. Never register the router in production builds. Add a startup log warning when test router is active.

**Expo build time in CI** — `npx expo run:android` can take 5+ minutes for a cold build.
→ Mitigation: Cache Gradle dependencies. Consider pre-built APK artifact from the build job. Long-term, use EAS Build for pre-built test APKs.
