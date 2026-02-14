## ADDED Requirements

### Requirement: Fixture factory functions
The system SHALL provide typed factory functions in `packages/e2e/fixtures/factories.ts` that create complete, valid test data using Prisma. Each factory SHALL return the created entities. A `FixtureName` type SHALL enumerate all available fixtures.

#### Scenario: Seed parent-with-school fixture
- **WHEN** `seedFixture("parent-with-school")` is called
- **THEN** the database SHALL contain a School, a User with email `parent@test.com`, an Account with `providerId: "credential"` and hashed password, a Student linked to the School, and a ParentStudent linking User to Student

#### Scenario: Seed staff-with-school fixture
- **WHEN** `seedFixture("staff-with-school")` is called
- **THEN** the database SHALL contain a School, a User with email `staff@test.com`, an Account with credentials, and a StaffMember linking User to School with admin role

### Requirement: Clean test data before seeding
The `seedFixture` function SHALL call `cleanTestData()` before creating new data. `cleanTestData()` SHALL truncate all tables in dependency order using `TRUNCATE ... CASCADE` to avoid foreign key violations.

#### Scenario: No leftover data between fixtures
- **WHEN** `seedFixture("parent-with-school")` is called after a previous `seedFixture("staff-with-school")`
- **THEN** no staff-related records SHALL remain in the database

### Requirement: Test credentials constants
The system SHALL export `TEST_CREDENTIALS` from `packages/e2e/fixtures/constants.ts` with entries for `parent` and `staff` roles, each containing `email` and `password` fields matching the values created by factories.

#### Scenario: Credentials match seeded data
- **WHEN** `TEST_CREDENTIALS.parent` is used to log in after seeding `parent-with-school`
- **THEN** authentication SHALL succeed

### Requirement: Test URL constants
The system SHALL export `TEST_URLS` from `packages/e2e/fixtures/constants.ts` with `api` and `web` fields defaulting to `http://localhost:4000` and `http://localhost:3000` respectively, overridable via `API_URL` and `WEB_URL` environment variables.

#### Scenario: URLs use environment overrides in CI
- **WHEN** `API_URL=http://api:4000` is set in the environment
- **THEN** `TEST_URLS.api` SHALL return `http://api:4000`

### Requirement: Test-only API seed endpoint
The API SHALL register a `testRouter` at `apps/api/src/router/test.ts` ONLY when `NODE_ENV=test`. The router SHALL expose a `seed` mutation accepting `{ fixture: string }` and calling `seedFixture()`. The router SHALL NOT be registered in any other environment.

#### Scenario: Seed via HTTP in test mode
- **WHEN** `POST /api/test/seed` is called with `{"fixture": "parent-with-school"}` and `NODE_ENV=test`
- **THEN** the database SHALL be cleaned and seeded with the parent-with-school fixture and the response SHALL be `{"ok": true}`

#### Scenario: Seed endpoint unavailable in production
- **WHEN** the API starts with `NODE_ENV=production`
- **THEN** no `/api/test/seed` route SHALL exist and requests to it SHALL return 404

### Requirement: Domain-specific fixture extensions
Beyond the base fixtures, the system SHALL provide extended fixtures for testing specific domains: `staff-with-messages` (school + staff + 5 messages), `parent-with-payments` (school + parent + student + 3 payment requests).

#### Scenario: Messages fixture includes message data
- **WHEN** `seedFixture("staff-with-messages")` is called
- **THEN** the database SHALL contain at least 5 Message records associated with the seeded school
