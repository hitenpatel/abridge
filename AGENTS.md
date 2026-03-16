# Abridge - AI Agent Guide

## What is this?

Abridge is a school-parent communication platform. Staff send messages, track attendance, collect payments, and manage forms. Parents view everything via web or mobile app.

## Monorepo Structure

```
apps/
  api/        Fastify + tRPC server (port 4000)
  web/        Next.js 16 App Router (port 3000)
  mobile/     Expo React Native
packages/
  db/         Prisma schema, client, seed script
  e2e/        E2E test infrastructure (Playwright + Maestro)
  tsconfig/   Shared TS configs
```

- **Package manager**: pnpm (workspace defined in `pnpm-workspace.yaml`)
- **Build orchestrator**: Turborepo (`turbo.json`)
- **Linter/formatter**: Biome (`biome.json`)
- **Node version**: 24 (`.nvmrc`)

## Quick Start

```bash
docker compose up -d                    # PostgreSQL (5432), Redis (6379)
npx pnpm install
npx pnpm db:push                       # Sync schema to database
npx pnpm db:seed                       # Seed test data (needs DATABASE_URL)
npx pnpm dev                           # Start all apps via turbo
```

## Auth System (better-auth)

- **Server config**: `apps/api/src/lib/auth.ts` - betterAuth with Prisma adapter
- **Client config**: `apps/web/src/lib/auth-client.ts` - createAuthClient pointing at API
- **Route handler**: `apps/api/src/index.ts` lines 78-124 - Fastify-to-Fetch adapter at `/api/auth/*`
- **Session extraction**: `apps/api/src/context.ts` - `auth.api.getSession()` called on every tRPC request

Users authenticate with email/password. better-auth stores credentials in the `Account` table (`providerId: "credential"`, hashed password). The `User` table holds profile data. Sessions are stored in the `Session` table with 7-day expiry.

**Important**: Users created directly via Prisma (e.g. in seed scripts) must also get an `Account` record with a hashed password, or they can't log in. Use `hashPassword` from `better-auth/crypto`.

## API Layer (tRPC)

**Entry**: `apps/api/src/router/index.ts` merges all routers.

### Middleware chain (defined in `apps/api/src/trpc.ts`)

| Procedure              | Auth? | Checks                                      |
|------------------------|-------|----------------------------------------------|
| `publicProcedure`      | No    | None                                         |
| `protectedProcedure`   | Yes   | `ctx.user` exists                            |
| `staffProcedure`       | Yes   | User is staff at any school                  |
| `adminProcedure`       | Yes   | User is ADMIN at any school                  |
| `schoolStaffProcedure` | Yes   | User is staff at `input.schoolId` (cached)   |
| `schoolAdminProcedure` | Yes   | User is ADMIN at `input.schoolId` (cached)   |

### Routers

| Router       | Key procedures                                            |
|--------------|-----------------------------------------------------------|
| `auth`       | `getSession` (returns user + roles + schoolId)            |
| `messaging`  | `send`, `listSent`, `listReceived`, `markRead`            |
| `attendance` | `getAttendanceForChild`, `reportAbsence`                  |
| `payments`   | `createCheckoutSession`, `listOutstandingPayments`, `getReceipt` |
| `calendar`   | `listEvents`, `createEvent`, `deleteEvent`                |
| `forms`      | `createTemplate`, `getPendingForms`, `submitForm`         |
| `dashboard`  | `getSummary` (children, metrics, events, attendance)      |
| `staff`      | `list`, `remove`, `updateRole` (admin only)               |
| `invitation` | `send`, `accept`, `verify`, `list`                        |
| `setup`      | `createInitialSchool` (key-protected, public)             |
| `stripe`     | `createOnboardingLink`, `getStripeStatus`                 |
| `user`       | `updatePushToken`, `listChildren`, `updateNotificationPreferences` |
| `health`     | `check`                                                   |
| `test`       | `seed` (test-only, guarded by `NODE_ENV=test`)            |

## Database (Prisma + PostgreSQL)

**Schema**: `packages/db/prisma/schema.prisma`

### Core models

- **School** - Multi-tenant root. Has URN (unique), optional Stripe account.
- **User** - Auth identity. Has email, push token, notification preferences.
- **Account** - better-auth credentials (`providerId` + `accountId` unique). Password stored here.
- **Session** - better-auth session tokens.
- **StaffMember** - Links User to School with role (ADMIN/TEACHER/OFFICE). Composite unique on `[userId, schoolId]`.
- **Invitation** - Pending staff invites. Token-based. Auto-processed on signup via auth hook.

### Domain models

- **Child** - Belongs to School. Has `firstName`, `lastName`, `yearGroup`, `className`.
- **ParentChild** - Links User (parent) to Child. Relation type: PARENT/GUARDIAN/CARER.
- **Message** - School broadcasts. Category: URGENT/STANDARD/FYI. Linked to children via `MessageChild`.
- **MessageRead** - Tracks which users read which messages.
- **AttendanceRecord** - Per child, per date, per session (AM/PM). Marks: PRESENT/ABSENT_AUTHORISED/ABSENT_UNAUTHORISED/LATE/NOT_REQUIRED.
- **PaymentItem** - Created by staff. Amount in pence. Linked to children via `PaymentItemChild`.
- **Payment** - Parent's payment record. Stripe checkout integration. Has line items.
- **Event** - Calendar events. Categories: TERM_DATE/INSET_DAY/EVENT/DEADLINE/CLUB.
- **FormTemplate** - JSON-defined form fields. Staff creates, parents fill.
- **FormResponse** - Submitted form data + optional signature (base64).
- **NotificationDelivery** - Tracks push/SMS/email delivery per message per user.

## Caching (Redis)

**Config**: `apps/api/src/lib/redis.ts` - Optional, graceful fallback if unavailable.

Staff membership is cached in Redis to avoid DB lookups on every request:
- Key pattern: `staff:{userId}:{schoolId}` or `staff:{userId}:all`
- TTL: 10 minutes
- Invalidated on role changes, staff removal, invitation acceptance

## External Services

| Service   | Purpose                  | Config env var            |
|-----------|--------------------------|---------------------------|
| Stripe    | Payment processing       | `STRIPE_SECRET_KEY`       |
| Resend    | Transactional email      | `RESEND_API_KEY`          |
| Twilio    | SMS notifications        | `TWILIO_ACCOUNT_SID`     |
| Expo      | Push notifications       | Via `expo-server-sdk`     |

## Non-tRPC Routes

- `POST /api/webhooks/stripe` - Stripe webhook handler (`apps/api/src/routes/webhooks.ts`)
- `POST /pdf/generate-receipt` - PDF generation (`apps/api/src/routes/pdf.ts`)
- `POST /pdf/generate-consent-form` - Consent form PDF

## Web App Routing

```
/                   Landing page
/login              Email/password login
/register           Registration (supports invitation tokens via ?token=)
/setup              Initial school setup (requires SETUP_KEY)
/dashboard          Protected - main hub
/dashboard/messages
/dashboard/payments
/dashboard/attendance
/dashboard/calendar
/dashboard/forms
/dashboard/admin    Staff management (admin only)
```

The dashboard layout (`apps/web/src/app/dashboard/layout.tsx`) fetches the session via `trpc.auth.getSession` and determines navigation based on staff roles.

## Environment Variables

### API (`apps/api/.env`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect
PORT=4000
WEB_URL=http://localhost:3000
BETTER_AUTH_SECRET=<any-string-locally, 32+-chars-in-prod>
BETTER_AUTH_URL=http://localhost:4000/api/auth
SETUP_KEY=admin123
RESEND_API_KEY=re_xxxxx           # optional
STRIPE_SECRET_KEY=sk_xxxxx        # optional
STRIPE_WEBHOOK_SECRET=whsec_xxxxx # optional
```

### Web

```
NEXT_PUBLIC_API_URL=http://localhost:4000   # baked at build time
```

## Testing

### Unit/Integration Tests

- **Framework**: Vitest (API + Web), Jest (Mobile)
- **API tests**: `apps/api/src/__tests__/*.test.ts` - Uses `appRouter.createCaller()` with mock context
- **CI**: GitHub Actions (`.github/workflows/ci.yml`) - lint, test (with PostgreSQL service), build

### E2E Testing (`packages/e2e`)

**Architecture**: Single source of truth (YAML journey specs) generates tests for both platforms:
- **Web**: Playwright tests auto-generated from YAML
- **Mobile**: Maestro flows auto-generated from YAML

**Key files**:
- `packages/e2e/journeys/**/*.yaml` - Journey specs defining user flows
- `packages/e2e/fixtures/factories.ts` - Prisma factories for test data seeding
- `packages/e2e/generators/to-playwright.ts` - YAML → Playwright generator
- `packages/e2e/generators/to-maestro.ts` - YAML → Maestro generator
- `packages/e2e/contracts/contract.test.ts` - tRPC API contract tests

**Test credentials** (defined in `fixtures/constants.ts`):
- Parent: `parent@test.com` / `testpass123`
- Staff: `staff@test.com` / `testpass123`

**Fixtures** (seed DB via `POST /api/test/seed` when `NODE_ENV=test`):
- `parent-with-school` - School + Parent + Student + credentials
- `staff-with-school` - School + Staff (admin) + credentials
- `staff-with-messages` - Staff + 5 messages
- `parent-with-payments` - Parent + 3 payment requests

**Commands**:
```bash
# Generate tests from YAML specs
pnpm --filter @schoolconnect/e2e generate:playwright
pnpm --filter @schoolconnect/e2e generate:maestro

# Run tests (requires API + Web/Mobile running)
pnpm --filter @schoolconnect/e2e test:web
maestro test packages/e2e/generated/maestro/

# View test coverage matrix
pnpm --filter @schoolconnect/e2e matrix

# Contract testing (catch API breaking changes)
pnpm --filter @schoolconnect/e2e contracts:check
```

**CI**: Two parallel jobs (`e2e-web`, `e2e-mobile`) run on PRs (smoke tests) and main (full suite). Nightly cron at 2 AM UTC runs full suite + contract checks.

**Tags**: Journey specs use tags for filtering:
- `smoke` - Critical paths (run on PRs)
- `authenticated`/`unauthenticated` - Auth state
- `parent`/`staff` - User role
- Domain tags: `auth`, `messaging`, `attendance`, `payments`, `forms`

## Common Gotchas

1. **Seed users can't log in**: The seed must create `Account` records with hashed passwords, not just `User` records. Use `hashPassword` from `better-auth/crypto`.
2. **Cross-origin cookies**: Web (3000) talks to API (4000). The tRPC client uses `credentials: 'include'`. CORS is configured with `credentials: true`. Both are same-site (localhost) so cookies work.
3. **Prisma schema `@map` directives**: The Account model fields must match actual DB column names. If you see "column does not exist" errors, check `@map()` annotations against the real database.
4. **`DATABASE_URL` not found in seed**: The db package doesn't have its own `.env`. Pass it inline: `DATABASE_URL=... npx pnpm db:seed`.
5. **Redis is optional**: The API starts fine without Redis. Staff membership queries fall back to direct DB lookups.
6. **`NEXT_PUBLIC_API_URL` is baked at build time**: Changing it requires rebuilding the web app.

## Docker

```bash
docker compose up -d        # PostgreSQL + Redis + Elasticsearch
docker compose down          # Stop all
```

Production Dockerfiles exist for API and Web (multi-stage builds with Node 24).
