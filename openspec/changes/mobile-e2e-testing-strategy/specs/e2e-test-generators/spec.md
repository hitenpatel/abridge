## ADDED Requirements

### Requirement: Playwright test generator
The system SHALL provide a `to-playwright.ts` generator at `packages/e2e/generators/` that reads all journey YAML specs and produces Playwright `.spec.ts` files in `packages/e2e/generated/playwright/`. Each generated file SHALL be a valid Playwright test that can run with `npx playwright test`.

#### Scenario: Generate Playwright test from journey spec
- **WHEN** `pnpm --filter @schoolconnect/e2e generate:playwright` is run
- **THEN** for each non-skipped journey, a `.spec.ts` file SHALL be created in `generated/playwright/` containing a `test()` block with the journey name, fixture seeding, login handling, step actions, and assertions

#### Scenario: Navigate action maps to Playwright route
- **WHEN** a step has `action: navigate` and `target: messages`
- **THEN** the generated test SHALL navigate to the corresponding web route (e.g., `page.goto('/dashboard/messages')`)

#### Scenario: Web selectors use data-testid
- **WHEN** a step has `selectors.web: "[data-testid='compose-btn']"`
- **THEN** the generated test SHALL use `page.getByTestId('compose-btn')` for element selection

### Requirement: Maestro flow generator
The system SHALL provide a `to-maestro.ts` generator at `packages/e2e/generators/` that reads all journey YAML specs and produces Maestro `.yaml` flow files in `packages/e2e/generated/maestro/`. Each generated file SHALL be a valid Maestro flow.

#### Scenario: Generate Maestro flow from journey spec
- **WHEN** `pnpm --filter @schoolconnect/e2e generate:maestro` is run
- **THEN** for each non-skipped journey, a `.yaml` file SHALL be created in `generated/maestro/` with the app ID header and Maestro commands matching the journey steps

#### Scenario: Mobile selectors use accessibility labels
- **WHEN** a step has `selectors.mobile: "Send"`
- **THEN** the generated Maestro flow SHALL use `tapOn: "Send"` for element interaction

#### Scenario: Fill action maps to Maestro input
- **WHEN** a step has `action: fill` with `selectors.mobile: "Email"` and `value: "test@example.com"`
- **THEN** the generated flow SHALL produce `tapOn: "Email"` followed by `inputText: "test@example.com"`

### Requirement: Generated output is gitignored
The `packages/e2e/generated/` directory SHALL be listed in `.gitignore`. Source of truth SHALL always be the YAML journey specs. CI SHALL regenerate output fresh on every run.

#### Scenario: Generated files not committed
- **WHEN** a developer runs the generators locally
- **THEN** the `generated/` directory SHALL be ignored by git and SHALL NOT appear in `git status`

### Requirement: Tag filtering in generators
Both generators SHALL accept a `--tags` CLI argument. When provided, only journeys whose `tags` array contains at least one matching tag SHALL be generated.

#### Scenario: Smoke-only generation
- **WHEN** `generate:playwright --tags smoke` is run with 15 journey specs, 7 tagged `smoke`
- **THEN** exactly 7 Playwright test files SHALL be generated

### Requirement: Route mapping configuration
The Playwright generator SHALL use a route map (`packages/e2e/generators/route-map.ts`) that maps journey `navigate` targets to web URL paths. The Maestro generator SHALL map navigate targets to tab names or screen navigation commands.

#### Scenario: Navigate target resolves to web route
- **WHEN** a journey step has `action: navigate, target: payments`
- **THEN** the Playwright generator SHALL look up `payments` in the route map and produce `page.goto('/dashboard/payments')`

#### Scenario: Navigate target resolves to mobile tab
- **WHEN** a journey step has `action: navigate, target: messages`
- **THEN** the Maestro generator SHALL produce a `tapOn: "Inbox"` command matching the mobile tab label
