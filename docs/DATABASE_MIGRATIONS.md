# Database Migrations

This project uses Prisma Migrate for database schema management. Migrations are version-controlled SQL files that track every schema change.

## Commands

### Create a new migration (development)

```bash
npx pnpm --filter @schoolconnect/db db:migrate:dev -- --name describe_change
```

This will:
- Diff your `schema.prisma` against the current database
- Generate a new SQL migration file in `packages/db/prisma/migrations/`
- Apply it to your local database
- Regenerate the Prisma Client

### Apply pending migrations (production / CI)

```bash
npx pnpm --filter @schoolconnect/db db:migrate
```

Runs `prisma migrate deploy` which applies all pending migrations without generating new ones. This is what CI and production environments use.

### Mark a migration as rolled back

```bash
npx pnpm --filter @schoolconnect/db exec prisma migrate resolve --rolled-back MIGRATION_NAME
```

Use this if a migration was partially applied and you need to mark it as rolled back so you can fix and re-apply it.

### Mark a migration as already applied

```bash
npx pnpm --filter @schoolconnect/db exec prisma migrate resolve --applied MIGRATION_NAME
```

Use this when baselining an existing database that already has the schema but no migration history.

## When to use `db:push` vs `db:migrate`

| Scenario | Command | Why |
|---|---|---|
| Rapid prototyping on local dev | `db:push` | Fast, no migration files generated |
| Ready to commit a schema change | `db:migrate:dev` | Creates a versioned migration file |
| CI / staging / production | `db:migrate` | Applies only committed migrations safely |

**Never use `db:push` against production databases.** It can drop columns/tables without warning and does not create migration history.

## Workflow

1. Edit `packages/db/prisma/schema.prisma`
2. Run `db:migrate:dev -- --name describe_change` to generate and apply the migration locally
3. Review the generated SQL in `packages/db/prisma/migrations/<timestamp>_describe_change/migration.sql`
4. Commit both the schema change and the migration file
5. CI will run `db:migrate` to apply it against the test database
6. On deploy, run `db:migrate` against the production database

## Existing Migrations

Migrations live in `packages/db/prisma/migrations/` and are applied in chronological order based on directory name (timestamp prefix).
