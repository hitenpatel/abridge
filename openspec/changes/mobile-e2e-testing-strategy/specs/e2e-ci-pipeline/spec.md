## ADDED Requirements

### Requirement: Web E2E CI job
The GitHub Actions CI workflow SHALL include an `e2e-web` job that runs after the `build` job. The job SHALL: start a PostgreSQL 16 service, generate Playwright tests from journey specs, push the DB schema, start the API and web servers, and run Playwright tests with headless Chromium.

#### Scenario: Web E2E passes on clean PR
- **WHEN** a PR is opened with no regressions in smoke-tagged journeys
- **THEN** the `e2e-web` job SHALL pass and report all smoke Playwright tests as passing

#### Scenario: Web E2E failure uploads report
- **WHEN** a Playwright test fails in CI
- **THEN** the job SHALL upload the Playwright HTML report as a GitHub Actions artifact for debugging

### Requirement: Mobile E2E CI job
The GitHub Actions CI workflow SHALL include an `e2e-mobile` job that runs after the `build` job. The job SHALL: start a PostgreSQL 16 service, generate Maestro flows from journey specs, push the DB schema, start the API server, boot an Android emulator (API 34, x86_64) using `reactivecircus/android-emulator-runner@v2`, build the Expo dev client, seed the DB via the test endpoint, and run Maestro flows.

#### Scenario: Mobile E2E passes on clean PR
- **WHEN** a PR is opened with no regressions in smoke-tagged journeys
- **THEN** the `e2e-mobile` job SHALL pass and report all smoke Maestro flows as passing

#### Scenario: Mobile E2E failure uploads report
- **WHEN** a Maestro flow fails in CI
- **THEN** the job SHALL upload the Maestro JUnit report as a GitHub Actions artifact

### Requirement: Parallel execution
The `e2e-web` and `e2e-mobile` jobs SHALL run in parallel (both depend on `build`, not on each other). A failure in one SHALL NOT prevent the other from completing.

#### Scenario: Web fails but mobile completes
- **WHEN** a web E2E test fails but all mobile flows pass
- **THEN** the `e2e-mobile` job SHALL still report success and its results SHALL be visible independently

### Requirement: Tag-based run strategy
On PR events, E2E jobs SHALL generate and run only `smoke`-tagged journeys. On push to `main`, E2E jobs SHALL run all journeys without tag filtering. A nightly cron schedule SHALL run all journeys plus contract snapshot checks.

#### Scenario: PR runs smoke only
- **WHEN** a PR is opened
- **THEN** generators SHALL run with `--tags smoke` and only smoke-tagged journeys SHALL be tested

#### Scenario: Main branch runs full suite
- **WHEN** code is pushed to `main`
- **THEN** generators SHALL run without tag filters and all journeys SHALL be tested

### Requirement: Ubuntu runners for both jobs
Both `e2e-web` and `e2e-mobile` jobs SHALL run on `ubuntu-latest` runners. The mobile job SHALL use KVM-accelerated Android emulator on Linux.

#### Scenario: Mobile emulator runs on Linux
- **WHEN** the `e2e-mobile` job starts on `ubuntu-latest`
- **THEN** the Android emulator SHALL boot with hardware acceleration and Maestro flows SHALL execute against it

### Requirement: Environment isolation
Each E2E job SHALL use its own PostgreSQL service instance with database name `schoolconnect_test`. The `NODE_ENV` SHALL be set to `test` so the test seed router is available. API and web servers SHALL start in test mode.

#### Scenario: Test seed endpoint available in CI
- **WHEN** the API starts in the `e2e-mobile` job with `NODE_ENV=test`
- **THEN** `POST /api/test/seed` SHALL be callable by the Maestro pre-seed curl command
