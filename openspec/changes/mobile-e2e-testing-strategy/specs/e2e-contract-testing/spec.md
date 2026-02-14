## ADDED Requirements

### Requirement: Contract snapshot generation
The system SHALL provide a `snapshot-generator.ts` at `packages/e2e/contracts/` that extracts all tRPC procedure input and output Zod schemas from `appRouter` and serializes them to `contracts/snapshots/api-contract.json`. Each entry SHALL be keyed by the full procedure path (e.g., `messaging.list`) with `input` and `output` string representations of the Zod schema.

#### Scenario: Generate snapshot from current router
- **WHEN** `pnpm --filter @schoolconnect/e2e contracts:update` is run
- **THEN** `contracts/snapshots/api-contract.json` SHALL contain an entry for every procedure in `appRouter` with serialized input and output schemas

### Requirement: Output shape changes fail the contract test
The contract test SHALL compare the committed snapshot against a freshly generated one. If any procedure's output schema has changed, the test SHALL fail with a message identifying the procedure and the change.

#### Scenario: Breaking output change detected
- **WHEN** a developer changes the output shape of `messaging.list` (e.g., removes a field)
- **THEN** `pnpm --filter @schoolconnect/e2e contracts:check` SHALL fail with a message like `messaging.list output changed`

### Requirement: Input shape changes warn but do not fail
If a procedure's input schema has changed, the contract test SHALL log a warning but SHALL NOT fail the test. Input changes may be additive (new optional fields) and are not necessarily breaking.

#### Scenario: Additive input change warns
- **WHEN** a developer adds an optional field to `messaging.list` input
- **THEN** `contracts:check` SHALL pass but log a warning: `messaging.list input changed - verify clients are updated`

### Requirement: Removed procedures fail the contract test
If a procedure exists in the committed snapshot but not in the fresh snapshot, the contract test SHALL fail identifying the removed procedure.

#### Scenario: Procedure removal detected
- **WHEN** a developer deletes the `messaging.search` procedure
- **THEN** `contracts:check` SHALL fail with `procedure messaging.search was removed`

### Requirement: New procedures are flagged without failing
If a procedure exists in the fresh snapshot but not in the committed one, the contract test SHALL log the new procedure name and suggest running `contracts:update` to track it. The test SHALL NOT fail.

#### Scenario: New procedure detected
- **WHEN** a developer adds a new `messaging.archive` procedure
- **THEN** `contracts:check` SHALL pass and log `New procedures: messaging.archive. Run contracts:update to track them`

### Requirement: Snapshot file is committed to git
The `contracts/snapshots/api-contract.json` file SHALL be committed to the repository. It serves as the baseline for contract comparison. Developers SHALL run `contracts:update` and commit the updated snapshot when making intentional API changes.

#### Scenario: Snapshot update workflow
- **WHEN** a developer intentionally changes `payments.create` output
- **THEN** they SHALL run `contracts:update`, verify the diff in `api-contract.json`, and commit the updated snapshot alongside their code change
