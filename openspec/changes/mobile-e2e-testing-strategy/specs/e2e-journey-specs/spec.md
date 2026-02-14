## ADDED Requirements

### Requirement: Journey spec file format
The system SHALL define user journeys in YAML files located at `packages/e2e/journeys/<domain>/<journey-id>.yaml`. Each file SHALL contain a `journey` root key with fields: `id` (kebab-case string), `name` (human-readable), `tags` (array of strings), `role` (`staff` or `parent`), optional `skipPlatforms` (array of `web` | `mobile`), `preconditions`, `steps`, and `assertions`.

#### Scenario: Valid journey spec is parsed
- **WHEN** a YAML file exists at `journeys/auth/login-parent.yaml` with all required fields
- **THEN** the spec parser SHALL load it without errors and return a typed `Journey` object

#### Scenario: Missing required field
- **WHEN** a YAML file omits the `id` field
- **THEN** the spec parser SHALL throw a validation error identifying the missing field

### Requirement: Preconditions define test state
Each journey spec SHALL include a `preconditions` block with `seed` (fixture name from `FixtureName` type) and `state` (`authenticated` or `unauthenticated`). Generators SHALL use preconditions to set up DB state and login status before running steps.

#### Scenario: Authenticated precondition
- **WHEN** a journey has `preconditions.state: authenticated` and `preconditions.seed: parent-with-school`
- **THEN** the generated test SHALL seed the DB with `parent-with-school` fixture and log in as the role's test user before executing steps

#### Scenario: Unauthenticated precondition
- **WHEN** a journey has `preconditions.state: unauthenticated`
- **THEN** the generated test SHALL seed the DB but NOT log in before executing steps

### Requirement: Fixed action set for steps
Steps SHALL use one of these actions: `navigate`, `tap`, `fill`, `scroll`, `wait`, `long-press`. Each step SHALL have `action`, `target` (human-readable identifier), and `selectors` (with `web` and `mobile` keys). The `fill` action SHALL additionally require a `value` field.

#### Scenario: Tap action with per-platform selectors
- **WHEN** a step has `action: tap` with `selectors.web: "[data-testid='send-btn']"` and `selectors.mobile: "Send"`
- **THEN** the Playwright generator SHALL use `page.getByTestId('send-btn').click()` and the Maestro generator SHALL use `tapOn: "Send"`

#### Scenario: Fill action
- **WHEN** a step has `action: fill` with `value: "test@example.com"`
- **THEN** the generated test SHALL type the value into the element identified by the platform selector

### Requirement: Declarative assertions
Each journey SHALL end with an `assertions` array. Assertion types SHALL be: `visible` (text appears on screen), `not-visible` (text absent), `count` (element count matches), and `navigate-back` (user returns to a target screen).

#### Scenario: Visible assertion
- **WHEN** an assertion has `type: visible` and `text: "Message sent"`
- **THEN** the generated Playwright test SHALL assert `expect(page.getByText("Message sent")).toBeVisible()` and the Maestro flow SHALL assert `assertVisible: "Message sent"`

### Requirement: Platform skip support
A journey MAY include `skipPlatforms: [mobile]` or `skipPlatforms: [web]`. Generators SHALL skip producing output for the specified platform. The test matrix SHALL report these as `skip` rather than `missing`.

#### Scenario: Journey skipped for mobile
- **WHEN** a journey has `skipPlatforms: [mobile]`
- **THEN** the Maestro generator SHALL NOT produce a flow file for this journey
- **AND** the test matrix SHALL show `skip` for the mobile column

### Requirement: Tag-based filtering
Journeys SHALL support a `tags` array. Generators SHALL support a `--tags` filter argument that only generates tests for journeys matching at least one specified tag. The `smoke` tag SHALL be used for the minimal PR-check suite.

#### Scenario: Generate only smoke-tagged journeys
- **WHEN** the generator runs with `--tags smoke`
- **THEN** only journeys containing `smoke` in their tags array SHALL have tests generated
