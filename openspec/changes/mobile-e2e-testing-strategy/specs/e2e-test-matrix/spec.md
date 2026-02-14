## ADDED Requirements

### Requirement: Programmatic coverage derivation
The system SHALL provide a `test-matrix.ts` module at `packages/e2e/` that loads all journey specs and compares them against generated output to determine per-platform coverage. Coverage SHALL be derived automatically, not manually maintained.

#### Scenario: Coverage calculated from specs and generated files
- **WHEN** 10 journey specs exist and 8 have generated Playwright files and 7 have generated Maestro files
- **THEN** `getTestMatrix()` SHALL return 10 entries with web coverage 8/10 and mobile coverage 7/10

### Requirement: Three coverage states per platform
Each journey SHALL report one of three states per platform: `covered` (generated test exists), `skip` (journey has `skipPlatforms` for this platform), or `missing` (no generated test and not skipped).

#### Scenario: Skipped platform shows as skip
- **WHEN** a journey has `skipPlatforms: [mobile]` and a Playwright test exists
- **THEN** the matrix entry SHALL show `web: "covered"` and `mobile: "skip"`

#### Scenario: Missing test shows as missing
- **WHEN** a journey has no `skipPlatforms` and no Maestro flow was generated
- **THEN** the matrix entry SHALL show `mobile: "missing"`

### Requirement: CLI matrix reporter
The system SHALL provide a `report-matrix.ts` script runnable via `pnpm --filter @schoolconnect/e2e matrix`. The output SHALL display a table with columns: Journey name, Web status, Mobile status, and Tags. A summary line SHALL show total coverage per platform.

#### Scenario: Matrix report displays table
- **WHEN** `pnpm --filter @schoolconnect/e2e matrix` is run
- **THEN** stdout SHALL display a formatted table listing all journeys with their per-platform status and a coverage summary line

### Requirement: JSON output for CI
The matrix reporter SHALL accept a `--json` flag that outputs structured JSON instead of a formatted table. This enables CI to parse results and post coverage summaries as PR comments.

#### Scenario: JSON output for CI parsing
- **WHEN** `pnpm --filter @schoolconnect/e2e matrix:ci` is run
- **THEN** stdout SHALL output valid JSON with an array of journey coverage objects and a summary object with per-platform totals

### Requirement: Domain grouping in output
The matrix report SHALL group journeys by domain (auth, messaging, attendance, payments, forms, dashboard) derived from the journey spec's directory path.

#### Scenario: Journeys grouped by domain
- **WHEN** the matrix report runs with journeys in `journeys/auth/` and `journeys/messaging/`
- **THEN** the output SHALL group auth journeys together and messaging journeys together with domain headers
