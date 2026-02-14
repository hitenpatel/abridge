## Why

SchoolConnect has no E2E integration layer connecting frontend to backend. API tests mock Prisma, web has 2 tests total, mobile has 4 screen tests and 4 local-only Maestro flows. Playwright is installed but unconfigured. Critical user journeys (login, messaging, payments) have no automated end-to-end validation, and mobile and web test identical flows independently with no shared infrastructure. Regressions ship undetected.

## What Changes

- Add `packages/e2e` package with shared YAML journey specs that define user flows once for both platforms
- Build generators that translate journey specs to Playwright tests (web) and Maestro flows (mobile)
- Create shared DB fixture/seeding layer using Prisma factories with a test-only API endpoint
- Add tRPC contract snapshot testing to catch API changes that break clients
- Add programmatic test matrix tracking coverage across platforms
- Add two parallel CI jobs to GitHub Actions: `e2e-web` (Playwright + headless Chromium) and `e2e-mobile` (Maestro + Android emulator)
- Add `data-testid` attributes to web components for E2E selectors
- Register test-only seed router in API when `NODE_ENV=test`

## Capabilities

### New Capabilities
- `e2e-journey-specs`: YAML spec format defining user journeys with per-platform selectors, actions, assertions, and preconditions
- `e2e-test-generators`: Translators that convert journey specs to Playwright test files and Maestro flow files
- `e2e-fixtures`: Shared DB seeding layer with Prisma factories, test credential constants, and a test-only API seed endpoint
- `e2e-contract-testing`: tRPC router snapshot generation and comparison (output changes fail, input changes warn)
- `e2e-ci-pipeline`: GitHub Actions jobs for web and mobile E2E with smoke/full run strategies
- `e2e-test-matrix`: Programmatic coverage tracking and CLI reporter showing per-platform journey coverage

### Modified Capabilities
None. All new infrastructure.

## Impact

- **New package**: `packages/e2e` with dependencies on `@schoolconnect/db`, `@playwright/test`, Vitest, yaml parser
- **API**: New test-only router (`apps/api/src/router/test.ts`) guarded by `NODE_ENV=test`
- **Web**: `data-testid` attributes added to interactive elements across dashboard pages
- **CI**: Two new parallel jobs added to `.github/workflows/ci.yml`, ~12 min wall time on PRs (smoke only)
- **Mobile**: Existing `.maestro/` flows superseded by generated flows from shared specs
- **Dependencies**: `yaml` (spec parsing), `@playwright/test` (already installed), `maestro` (CI install)
