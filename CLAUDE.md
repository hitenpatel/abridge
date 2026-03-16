# Abridge

School-parent communication platform. Staff send messages, track attendance, collect payments, manage forms. Parents view via web or mobile.

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo. Node 24.
- **API** (`apps/api`): Fastify + tRPC + better-auth. Port 4000.
- **Web** (`apps/web`): Next.js 16 App Router + TailwindCSS. Port 3000.
- **Mobile** (`apps/mobile`): Expo React Native.
- **DB** (`packages/db`): Prisma + PostgreSQL. Schema at `packages/db/prisma/schema.prisma`.
- **Cache**: Redis (optional, for staff membership caching).

## Key Files

| What | Where |
|---|---|
| Prisma schema | `packages/db/prisma/schema.prisma` |
| Seed script | `packages/db/prisma/seed.ts` |
| tRPC routers | `apps/api/src/router/*.ts` |
| Router registry | `apps/api/src/router/index.ts` |
| Procedure middleware | `apps/api/src/trpc.ts` |
| Auth config (server) | `apps/api/src/lib/auth.ts` |
| Auth client (web) | `apps/web/src/lib/auth-client.ts` |
| tRPC client (web) | `apps/web/src/lib/trpc.ts` |
| Dashboard layout/nav | `apps/web/src/app/dashboard/layout.tsx` |
| API env vars | `apps/api/.env` |
| CORS config | `apps/api/src/index.ts` (`getCorsOptions`) |

## Commands

```bash
npx pnpm dev                           # Start all apps
npx pnpm build                         # Build all
npx pnpm test                          # Test all
npx pnpm lint                          # Biome lint
npx pnpm lint:fix                      # Biome auto-fix

# Database (requires DATABASE_URL inline for packages/db)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:seed
npx pnpm --filter @schoolconnect/db db:generate
```

## Auth Gotchas

- Auth is **better-auth** (not NextAuth). Email/password login.
- Login requires both a `User` record AND an `Account` record with `providerId: "credential"` and a hashed password.
- Users created directly via Prisma (seed/scripts) must create Account records using `hashPassword` from `better-auth/crypto`.
- Do NOT change `@map()` directives on the Account model - column names must match the actual database.

## tRPC Middleware

`publicProcedure` → `protectedProcedure` (needs login) → `schoolStaffProcedure` (needs `input.schoolId`, staff at that school) → `schoolAdminProcedure` (admin at that school).

School-scoped procedures auto-require `schoolId` in input and add `ctx.schoolId` + `ctx.staffMember`.

## Git Commits

- Do NOT add Co-Authored-By lines, attribution footers, or "Generated with" lines to commit messages
- Keep commit messages concise: type prefix + short description (e.g., `feat: add mobile theme system`)

## Conventions

- Amounts in **pence** (integer), not pounds
- Dates without time use `@db.Date` in Prisma
- IDs are CUIDs
- Transformer is `superjson` (Dates serialize automatically)
- Linting/formatting via Biome (not ESLint/Prettier)
- Web styling: Tailwind only, icons from `lucide-react`
- All dashboard pages are `"use client"` components

## Testing Requirements

Every new feature must include tests across all three platforms:

- **Web E2E** (`e2e/`): Playwright tests covering the web dashboard flow. Run with `npx playwright test`.
- **Mobile E2E — Android & iOS** (`apps/mobile/.maestro/`): Maestro YAML flows exercising the mobile screen. Add flows under `parent/`, `staff/`, or `admin/` as appropriate.
- **API unit tests** (`apps/api/src/__tests__/`): Vitest tests for any new or modified tRPC procedures.
- **Seed data** (`packages/db/prisma/seed.ts`): If the feature introduces new models or screens that need data to render, add seed entries so e2e tests have something to exercise.

Do NOT consider a feature complete until all applicable test layers are addressed.

## Full Reference

See `AGENTS.md` for complete documentation including all Prisma models, all tRPC procedures, environment variables, infrastructure, and deployment details.
