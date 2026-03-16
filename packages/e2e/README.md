# @schoolconnect/e2e

End-to-end testing infrastructure for Abridge. Tests web (Playwright) and mobile (Maestro) from a single source of truth: YAML journey specs.

## Architecture

```
packages/e2e/
├── journeys/           # YAML specs defining user flows (source of truth)
│   ├── auth/
│   ├── messaging/
│   ├── attendance/
│   └── ...
├── fixtures/           # Prisma factories for test data
├── generators/         # Translate YAML → Playwright/Maestro
├── contracts/          # tRPC API contract testing
├── scripts/            # CLI tools (test matrix reporter)
└── generated/          # Auto-generated tests (gitignored)
    ├── playwright/     # Web E2E tests
    └── maestro/        # Mobile E2E flows
```

## Quick Start

### 1. Generate Tests

```bash
# Generate Playwright tests (web)
pnpm --filter @schoolconnect/e2e generate:playwright

# Generate Maestro flows (mobile)
pnpm --filter @schoolconnect/e2e generate:maestro

# Generate only smoke-tagged tests
pnpm --filter @schoolconnect/e2e generate:playwright --tags=smoke
```

### 2. Run Tests

```bash
# Web (requires API + Web running on localhost:4000/3000)
pnpm --filter @schoolconnect/e2e test:web

# Mobile (requires API + Android emulator)
cd packages/e2e && maestro test generated/maestro/
```

### 3. View Coverage

```bash
# Show test matrix (which journeys are covered on each platform)
pnpm --filter @schoolconnect/e2e matrix

# JSON output for CI
pnpm --filter @schoolconnect/e2e matrix:ci
```

## Journey Specs

Journey specs live in `journeys/<domain>/<journey-id>.yaml`. Each defines:

- **Preconditions**: Fixture to seed + authentication state
- **Steps**: Actions to perform (navigate, tap, fill, scroll, wait)
- **Assertions**: What should be visible/present after steps complete

### Example

```yaml
journey:
  id: login-parent
  name: Parent Login
  tags: [smoke, parent, unauthenticated]
  role: parent
  preconditions:
    seed: parent-with-school
    state: unauthenticated
  steps:
    - action: fill
      target: email-input
      selectors:
        web: "[data-testid='email-input']"
        mobile: "Email"
      value: parent@test.com
    - action: tap
      target: login-button
      selectors:
        web: "[data-testid='login-button']"
        mobile: "Sign In"
  assertions:
    - type: visible
      text: "Inbox"
```

### Actions

| Action | Web | Mobile |
|--------|-----|--------|
| `navigate` | `page.goto()` | `tapOn` tab |
| `tap` | `getByTestId().click()` | `tapOn` label |
| `fill` | `getByTestId().fill()` | `tapOn` + `inputText` |
| `scroll` | `scrollIntoViewIfNeeded()` | `scrollUntilVisible` |
| `wait` | `waitFor()` | `waitForAnimationToEnd` |
| `long-press` | `click({ delay: 1000 })` | `longPressOn` |

### Assertions

| Type | Web | Mobile |
|------|-----|--------|
| `visible` | `expect().toBeVisible()` | `assertVisible` |
| `not-visible` | `expect().not.toBeVisible()` | `assertNotVisible` |
| `count` | `expect().toHaveCount()` | N/A |
| `navigate-back` | `expect(page).toHaveURL()` | N/A |

### Tags

- `smoke` - Critical paths, run on every PR
- `authenticated` / `unauthenticated` - Auth state
- `parent` / `staff` - User role
- Domain tags: `auth`, `messaging`, `attendance`, `payments`, `forms`

### Skip Platforms

```yaml
skipPlatforms: [mobile]  # Web only
skipPlatforms: [web]     # Mobile only
```

## Fixtures

Fixtures seed test data using Prisma. Available fixtures:

| Fixture | Creates |
|---------|---------|
| `parent-with-school` | School + Parent user + Student + auth credentials |
| `staff-with-school` | School + Staff user (admin) + auth credentials |
| `staff-with-messages` | Staff fixture + 5 messages |
| `parent-with-payments` | Parent fixture + 3 payment requests |

Fixtures are called via:
- **Web**: HTTP request to `POST /api/test/seed` before test runs
- **Mobile**: `curl` command in Maestro flow

All fixtures clean the database first (truncate in dependency order).

## Test Credentials

Defined in `fixtures/constants.ts`:

```typescript
TEST_CREDENTIALS = {
  parent: { email: "parent@test.com", password: "testpass123" },
  staff: { email: "staff@test.com", password: "testpass123" },
}
```

## Contract Testing

Snapshot-based tRPC contract tests catch API breaking changes before E2E:

```bash
# Generate initial snapshot
pnpm --filter @schoolconnect/e2e contracts:update

# Check for breaking changes
pnpm --filter @schoolconnect/e2e contracts:check
```

**Rules**:
- Output schema changes → **Fail** (breaking for clients)
- Input schema changes → **Warn** (may be additive)
- Removed procedures → **Fail** (breaking)
- New procedures → **Log** (informational)

## CI Pipeline

Two parallel jobs in `.github/workflows/ci.yml`:

### `e2e-web`
- PostgreSQL service
- Generate Playwright tests (smoke on PR, full on main)
- Start API + Web servers
- Run tests with Chromium
- Upload report on failure

### `e2e-mobile`
- PostgreSQL service
- Generate Maestro flows (smoke on PR, full on main)
- Start API server
- Boot Android emulator
- Build Expo app
- Run Maestro flows
- Upload report on failure

**Nightly schedule**: Full suite + contract checks at 2 AM UTC

## Test Matrix

View coverage across platforms:

```bash
pnpm --filter @schoolconnect/e2e matrix
```

Output:

```
╔═══════════════════════════════════════════════════════════╗
║         E2E Test Coverage Matrix                          ║
╚═══════════════════════════════════════════════════════════╝

📁 AUTH
────────────────────────────────────────────────────────────
Journey                                 Web     Mobile
────────────────────────────────────────────────────────────
Parent Login                            ✓       ✓
Staff Login                             ✓       ✓
Logout                                  ✓       ✓

📁 MESSAGING
────────────────────────────────────────────────────────────
Journey                                 Web     Mobile
────────────────────────────────────────────────────────────
View Messages                           ✓       ✓
Compose Message                         ✓       ✓
Search Messages                         ✓       ✓

...

Web Coverage: 100% | Mobile Coverage: 92%
```

## Adding a New Journey

1. **Create YAML spec** in `journeys/<domain>/<id>.yaml`
2. **Add data-testid** to web components (if needed)
3. **Add accessibility labels** to mobile components (if needed)
4. **Regenerate tests**: `pnpm generate:playwright && pnpm generate:maestro`
5. **Run locally** to verify
6. **Check coverage**: `pnpm matrix`

## Debugging

### Web Tests

```bash
# Run with UI
pnpm --filter @schoolconnect/e2e test:web --ui

# Run specific test
npx playwright test login-parent.spec.ts

# Debug mode
npx playwright test --debug
```

### Mobile Flows

```bash
# Validate flow syntax
maestro validate packages/e2e/generated/maestro/login-parent.yaml

# Run single flow
maestro test packages/e2e/generated/maestro/login-parent.yaml

# Studio mode (interactive)
maestro studio
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required | PostgreSQL connection for test DB |
| `API_URL` | `http://localhost:4000` | API server URL |
| `WEB_URL` | `http://localhost:3000` | Web app URL |
| `NODE_ENV` | `test` | Must be `test` for seed endpoint |

## Migration Guide

### From Manual Tests

1. Identify user flow
2. Write YAML journey spec
3. Add selectors (web: `data-testid`, mobile: accessibility labels)
4. Generate tests
5. Delete old manual tests

### Adding Test Coverage

1. Check coverage: `pnpm matrix`
2. Identify gaps (missing journeys or platforms)
3. Write journey specs for gaps
4. Regenerate tests
5. Verify coverage improved
