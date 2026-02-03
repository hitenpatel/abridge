# SchoolConnect Architecture & Scaffolding Implementation Plan

> **For AI models:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the full-stack monorepo foundation for SchoolConnect with database schema, API layer, web app, mobile app, auth, and CI — ready for feature development.

**Architecture:** Turborepo monorepo with shared TypeScript packages. The API uses Fastify + tRPC (type-safe, simpler than GraphQL for this stage). PostgreSQL via Prisma ORM. Next.js web app and Expo (React Native) mobile app consume the same tRPC client. Auth via better-auth. All deployed to AWS UK region.

**Tech Stack:**
- **Monorepo:** Turborepo + pnpm workspaces
- **API:** Fastify + tRPC v11 + TypeScript
- **Database:** PostgreSQL + Prisma ORM + Redis (via ioredis)
- **Web:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Mobile:** Expo SDK 52 (React Native) + TypeScript
- **Auth:** better-auth (supports multi-tenant, social login, MFA)
- **Testing:** Vitest (unit/integration), Playwright (e2e web), Detox (e2e mobile)
- **CI:** GitHub Actions
- **Linting:** Biome (replaces ESLint + Prettier — faster, simpler)

**Why these alternatives over the PRD stack:**
- **tRPC over GraphQL:** End-to-end type safety with zero schema duplication. We own both clients. GraphQL is better when third parties consume your API — not the case here.
- **Fastify over Express:** 2-3x faster, built-in schema validation, better TypeScript support.
- **Prisma over raw SQL:** Type-safe queries, migration management, works well with tRPC for shared types.
- **Expo over bare React Native:** Managed workflow reduces native build complexity. EAS Build handles CI. OTA updates built in.
- **Biome over ESLint+Prettier:** Single tool, 10-100x faster, less config.
- **better-auth over NextAuth:** More flexible, supports multi-tenant out of the box, works outside Next.js (our API is separate).

---

### Task 1: Initialize Monorepo

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `biome.json`

**Step 1: Initialize git and root package.json**

```bash
cd /Users/hitenpatel/dev/personal/abridge
git init
```

**Step 2: Create root package.json**

Create `package.json`:

```json
{
  "name": "schoolconnect",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "db:migrate": "pnpm --filter @schoolconnect/api db:migrate",
    "db:push": "pnpm --filter @schoolconnect/api db:push",
    "db:studio": "pnpm --filter @schoolconnect/api db:studio"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "turbo": "^2.3.0"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 3: Create workspace config files**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

Create `.nvmrc`:

```
20
```

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "dist",
      ".expo",
      "*.generated.*"
    ]
  }
}
```

Create `.gitignore`:

```
node_modules/
.next/
dist/
.expo/
*.tsbuildinfo
.env
.env.local
.env.*.local
.turbo/
coverage/
*.db
```

**Step 4: Install root dependencies**

```bash
pnpm install
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: initialize turborepo monorepo with pnpm workspaces"
```

---

### Task 2: Create Shared TypeScript Config Package

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/nextjs.json`
- Create: `packages/tsconfig/react-native.json`

**Step 1: Create the package**

Create `packages/tsconfig/package.json`:

```json
{
  "name": "@schoolconnect/tsconfig",
  "private": true,
  "version": "0.0.0"
}
```

**Step 2: Create base tsconfig**

Create `packages/tsconfig/base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create Next.js tsconfig**

Create `packages/tsconfig/nextjs.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 4: Create React Native tsconfig**

Create `packages/tsconfig/react-native.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "types": ["react-native"]
  }
}
```

**Step 5: Commit**

```bash
git add packages/tsconfig/
git commit -m "chore: add shared TypeScript config package"
```

---

### Task 3: Database Schema with Prisma

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/client.ts`

**Step 1: Create db package**

Create `packages/db/package.json`:

```json
{
  "name": "@schoolconnect/db",
  "private": true,
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "build": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.3.0"
  },
  "devDependencies": {
    "prisma": "^6.3.0",
    "typescript": "^5.7.0",
    "@schoolconnect/tsconfig": "workspace:*"
  }
}
```

Create `packages/db/tsconfig.json`:

```json
{
  "extends": "@schoolconnect/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

**Step 2: Create Prisma schema**

This schema covers the core entities for Phase 1: schools, users, children, messages, payments, attendance.

Create `packages/db/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Multi-tenancy ───────────────────────────────────────────

model School {
  id        String   @id @default(cuid())
  name      String
  urn       String   @unique // Ofsted URN
  address   String?
  phone     String?
  email     String?
  logoUrl   String?
  timezone  String   @default("Europe/London")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  staff      StaffMember[]
  children   Child[]
  messages   Message[]
  payments   PaymentItem[]
  events     Event[]
  attendance AttendanceRecord[]

  @@map("schools")
}

// ─── Users & Roles ───────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  phone         String?
  language      String    @default("en")
  avatarUrl     String?
  quietStart    String?   // HH:mm format
  quietEnd      String?   // HH:mm format
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  parentLinks   ParentChild[]
  staffLinks    StaffMember[]
  messageReads  MessageRead[]
  payments      Payment[]
  sessions      Session[]
  accounts      Account[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  expiresAt         Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// ─── School Staff ────────────────────────────────────────────

model StaffMember {
  id       String    @id @default(cuid())
  userId   String
  schoolId String
  role     StaffRole @default(TEACHER)

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([userId, schoolId])
  @@map("staff_members")
}

enum StaffRole {
  ADMIN
  TEACHER
  OFFICE
}

// ─── Children & Parent Links ─────────────────────────────────

model Child {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  dateOfBirth DateTime @db.Date
  yearGroup   String?
  className   String?
  avatarUrl   String?
  schoolId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school      School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  parentLinks ParentChild[]
  attendance  AttendanceRecord[]
  messages    MessageChild[]
  payments    PaymentItemChild[]

  @@map("children")
}

model ParentChild {
  id       String             @id @default(cuid())
  userId   String
  childId  String
  relation ParentRelationType @default(PARENT)

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@unique([userId, childId])
  @@map("parent_children")
}

enum ParentRelationType {
  PARENT
  GUARDIAN
  CARER
}

// ─── Messaging ───────────────────────────────────────────────

model Message {
  id        String          @id @default(cuid())
  schoolId  String
  subject   String
  body      String
  category  MessageCategory @default(STANDARD)
  authorId  String?
  createdAt DateTime        @default(now())

  school   School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  children MessageChild[]
  reads    MessageRead[]

  @@index([schoolId, createdAt])
  @@map("messages")
}

model MessageChild {
  messageId String
  childId   String

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  child   Child   @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@id([messageId, childId])
  @@map("message_children")
}

model MessageRead {
  id        String   @id @default(cuid())
  messageId String
  userId    String
  readAt    DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId])
  @@map("message_reads")
}

enum MessageCategory {
  URGENT
  STANDARD
  FYI
}

// ─── Attendance ──────────────────────────────────────────────

model AttendanceRecord {
  id       String         @id @default(cuid())
  childId  String
  schoolId String
  date     DateTime       @db.Date
  session  SchoolSession
  mark     AttendanceMark
  note     String?

  child  Child  @relation(fields: [childId], references: [id], onDelete: Cascade)
  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([childId, date, session])
  @@index([schoolId, date])
  @@map("attendance_records")
}

enum SchoolSession {
  AM
  PM
}

enum AttendanceMark {
  PRESENT
  ABSENT_AUTHORISED
  ABSENT_UNAUTHORISED
  LATE
  NOT_REQUIRED
}

// ─── Payments ────────────────────────────────────────────────

model PaymentItem {
  id          String        @id @default(cuid())
  schoolId    String
  title       String
  description String?
  amount      Int           // in pence
  dueDate     DateTime?     @db.Date
  category    PaymentCategory
  createdAt   DateTime      @default(now())

  school   School             @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  children PaymentItemChild[]
  payments PaymentLineItem[]

  @@map("payment_items")
}

model PaymentItemChild {
  paymentItemId String
  childId       String

  paymentItem PaymentItem @relation(fields: [paymentItemId], references: [id], onDelete: Cascade)
  child       Child       @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@id([paymentItemId, childId])
  @@map("payment_item_children")
}

model Payment {
  id            String        @id @default(cuid())
  userId        String
  totalAmount   Int           // in pence
  status        PaymentStatus @default(PENDING)
  stripeId      String?       @unique
  receiptNumber String?       @unique
  createdAt     DateTime      @default(now())
  completedAt   DateTime?

  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  lineItems PaymentLineItem[]

  @@map("payments")
}

model PaymentLineItem {
  id            String @id @default(cuid())
  paymentId     String
  paymentItemId String
  childId       String?
  amount        Int    // in pence

  payment     Payment     @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  paymentItem PaymentItem @relation(fields: [paymentItemId], references: [id], onDelete: Cascade)

  @@map("payment_line_items")
}

enum PaymentCategory {
  DINNER_MONEY
  TRIP
  CLUB
  UNIFORM
  OTHER
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// ─── Calendar ────────────────────────────────────────────────

model Event {
  id        String    @id @default(cuid())
  schoolId  String
  title     String
  body      String?
  startDate DateTime
  endDate   DateTime?
  allDay    Boolean   @default(false)
  category  EventCategory
  createdAt DateTime  @default(now())

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, startDate])
  @@map("events")
}

enum EventCategory {
  TERM_DATE
  INSET_DAY
  EVENT
  DEADLINE
  CLUB
}
```

**Step 3: Create db client module**

Create `packages/db/src/client.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Create `packages/db/src/index.ts`:

```typescript
export { prisma } from "./client";
export * from "@prisma/client";
```

**Step 4: Install and generate**

```bash
cd /Users/hitenpatel/dev/personal/abridge
pnpm install
pnpm --filter @schoolconnect/db db:generate
```

**Step 5: Commit**

```bash
git add packages/db/
git commit -m "feat: add database package with Prisma schema for core entities"
```

---

### Task 4: API Server with Fastify + tRPC

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/trpc.ts`
- Create: `apps/api/src/context.ts`
- Create: `apps/api/src/router/index.ts`
- Create: `apps/api/src/router/health.ts`
- Create: `apps/api/.env.example`

**Step 1: Create API package.json**

Create `apps/api/package.json`:

```json
{
  "name": "@schoolconnect/api",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "db:migrate": "prisma migrate dev --schema=../../packages/db/prisma/schema.prisma",
    "db:push": "prisma db push --schema=../../packages/db/prisma/schema.prisma",
    "db:studio": "prisma studio --schema=../../packages/db/prisma/schema.prisma"
  },
  "dependencies": {
    "@schoolconnect/db": "workspace:*",
    "@trpc/server": "^11.0.0",
    "fastify": "^5.2.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/websocket": "^11.0.0",
    "superjson": "^2.2.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@schoolconnect/tsconfig": "workspace:*",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "@schoolconnect/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 2: Create tRPC setup**

Create `apps/api/src/context.ts`:

```typescript
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { prisma } from "@schoolconnect/db";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // TODO: Extract user from session/token in auth task
  return {
    prisma,
    req,
    res,
    user: null as null | { id: string; email: string },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

Create `apps/api/src/trpc.ts`:

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

**Step 3: Create routers**

Create `apps/api/src/router/health.ts`:

```typescript
import { router, publicProcedure } from "../trpc";

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});
```

Create `apps/api/src/router/index.ts`:

```typescript
import { router } from "../trpc";
import { healthRouter } from "./health";

export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
```

**Step 4: Create Fastify server entry**

Create `apps/api/src/index.ts`:

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./router";
import { createContext } from "./context";

const server = Fastify({ logger: true });

async function main() {
  await server.register(cors, {
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  });

  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  const port = Number(process.env.PORT ?? 4000);
  await server.listen({ port, host: "0.0.0.0" });
  console.log(`API server running on port ${port}`);
}

main().catch((err) => {
  server.log.error(err);
  process.exit(1);
});
```

**Step 5: Create .env.example**

Create `apps/api/.env.example`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect
PORT=4000
WEB_URL=http://localhost:3000
```

**Step 6: Install and verify**

```bash
pnpm install
```

**Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat: add API server with Fastify + tRPC and health endpoint"
```

---

### Task 5: API Tests

**Files:**
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/__tests__/health.test.ts`

**Step 1: Write the failing test**

Create `apps/api/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

Create `apps/api/src/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { appRouter } from "../router";
import type { Context } from "../context";

function createTestContext(overrides?: Partial<Context>): Context {
  return {
    prisma: {} as Context["prisma"],
    req: {} as Context["req"],
    res: {} as Context["res"],
    user: null,
    ...overrides,
  };
}

describe("health router", () => {
  it("returns ok status", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.health.check();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
pnpm --filter @schoolconnect/api test -- --run
```

Expected: PASS

**Step 3: Commit**

```bash
git add apps/api/vitest.config.ts apps/api/src/__tests__/
git commit -m "test: add health endpoint test with tRPC caller"
```

---

### Task 6: Next.js Web Application

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/lib/trpc.ts`

**Step 1: Create web package.json**

Create `apps/web/package.json`:

```json
{
  "name": "@schoolconnect/web",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "test": "vitest"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@tanstack/react-query": "^5.62.0",
    "superjson": "^2.2.0"
  },
  "devDependencies": {
    "@schoolconnect/tsconfig": "workspace:*",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

**Step 2: Create config files**

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "@schoolconnect/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@schoolconnect/api/*": ["../../apps/api/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "../../apps/api/src/router/index.ts"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@schoolconnect/db"],
};

export default nextConfig;
```

Create `apps/web/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

Create `apps/web/postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: Create app shell**

Create `apps/web/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `apps/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolConnect",
  description: "School-parent communication platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
```

Create `apps/web/src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-700">SchoolConnect</h1>
        <p className="mt-2 text-gray-600">School-parent communication platform</p>
      </div>
    </main>
  );
}
```

**Step 4: Create tRPC client**

Create `apps/web/src/lib/trpc.ts`:

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@schoolconnect/api/router";

export const trpc = createTRPCReact<AppRouter>();
```

**Step 5: Install and verify build**

```bash
pnpm install
pnpm --filter @schoolconnect/web build
```

**Step 6: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js web app with tRPC client and Tailwind"
```

---

### Task 7: Expo Mobile Application

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/App.tsx`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/src/lib/trpc.ts`

**Step 1: Create mobile package**

Create `apps/mobile/package.json`:

```json
{
  "name": "@schoolconnect/mobile",
  "private": true,
  "version": "0.0.0",
  "main": "App.tsx",
  "scripts": {
    "dev": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build": "echo 'Mobile build handled by EAS'"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "^18.3.0",
    "react-native": "0.76.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.4.0",
    "@expo/vector-icons": "^14.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@tanstack/react-query": "^5.62.0",
    "superjson": "^2.2.0"
  },
  "devDependencies": {
    "@schoolconnect/tsconfig": "workspace:*",
    "@types/react": "^18.3.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create config files**

Create `apps/mobile/tsconfig.json`:

```json
{
  "extends": "@schoolconnect/tsconfig/react-native.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "../../apps/api/src/router/index.ts"]
}
```

Create `apps/mobile/app.json`:

```json
{
  "expo": {
    "name": "SchoolConnect",
    "slug": "schoolconnect",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "schoolconnect",
    "platforms": ["ios", "android"],
    "ios": {
      "bundleIdentifier": "com.schoolconnect.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.schoolconnect.app",
      "adaptiveIcon": {
        "backgroundColor": "#2563eb"
      }
    }
  }
}
```

Create `apps/mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

**Step 3: Create app entry**

Create `apps/mobile/App.tsx`:

```tsx
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SchoolConnect</Text>
      <Text style={styles.subtitle}>School-parent communication platform</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1d4ed8",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 8,
  },
});
```

**Step 4: Create tRPC client**

Create `apps/mobile/src/lib/trpc.ts`:

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@schoolconnect/api/router";

export const trpc = createTRPCReact<AppRouter>();
```

**Step 5: Install**

```bash
pnpm install
```

**Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat: add Expo mobile app with tRPC client"
```

---

### Task 8: Docker Compose for Local Development

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/.env` (from .env.example)

**Step 1: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: schoolconnect
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**Step 2: Create .env for API**

Create `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect
PORT=4000
WEB_URL=http://localhost:3000
```

**Step 3: Verify docker services start**

```bash
docker compose up -d
docker compose ps
```

Expected: Both postgres and redis running.

**Step 4: Run initial migration**

```bash
pnpm --filter @schoolconnect/api db:push
```

Expected: Schema pushed to PostgreSQL.

**Step 5: Commit**

```bash
git add docker-compose.yml apps/api/.env.example
git commit -m "chore: add Docker Compose for local PostgreSQL and Redis"
```

---

### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: schoolconnect_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/schoolconnect_test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

**Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow for lint, test, and build"
```

---

### Task 10: Seed Script for Development

**Files:**
- Create: `packages/db/prisma/seed.ts`
- Modify: `packages/db/package.json` (add seed script)

**Step 1: Create seed script**

Create `packages/db/prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a school
  const school = await prisma.school.upsert({
    where: { urn: "123456" },
    update: {},
    create: {
      name: "Oakwood Primary School",
      urn: "123456",
      address: "123 Oak Lane, London, SE1 1AA",
      phone: "020 7123 4567",
      email: "office@oakwood.sch.uk",
    },
  });

  // Create a parent user
  const parent = await prisma.user.upsert({
    where: { email: "sarah@example.com" },
    update: {},
    create: {
      email: "sarah@example.com",
      name: "Sarah Johnson",
      phone: "+447700900001",
    },
  });

  // Create an admin user
  const admin = await prisma.user.upsert({
    where: { email: "claire@oakwood.sch.uk" },
    update: {},
    create: {
      email: "claire@oakwood.sch.uk",
      name: "Claire Thompson",
    },
  });

  // Link admin as staff
  await prisma.staffMember.upsert({
    where: { userId_schoolId: { userId: admin.id, schoolId: school.id } },
    update: {},
    create: {
      userId: admin.id,
      schoolId: school.id,
      role: "ADMIN",
    },
  });

  // Create children
  const child1 = await prisma.child.create({
    data: {
      firstName: "Emily",
      lastName: "Johnson",
      dateOfBirth: new Date("2019-03-15"),
      yearGroup: "Year 2",
      className: "2B",
      schoolId: school.id,
    },
  });

  const child2 = await prisma.child.create({
    data: {
      firstName: "Jack",
      lastName: "Johnson",
      dateOfBirth: new Date("2016-07-22"),
      yearGroup: "Year 5",
      className: "5A",
      schoolId: school.id,
    },
  });

  // Link parent to children
  await prisma.parentChild.createMany({
    data: [
      { userId: parent.id, childId: child1.id, relation: "PARENT" },
      { userId: parent.id, childId: child2.id, relation: "PARENT" },
    ],
  });

  // Create a sample message
  await prisma.message.create({
    data: {
      schoolId: school.id,
      subject: "Welcome to SchoolConnect!",
      body: "We are excited to launch our new communication platform. You can now receive messages, view attendance, and make payments all in one place.",
      category: "STANDARD",
      children: {
        create: [{ childId: child1.id }, { childId: child2.id }],
      },
    },
  });

  // Create sample attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.attendanceRecord.createMany({
    data: [
      { childId: child1.id, schoolId: school.id, date: today, session: "AM", mark: "PRESENT" },
      { childId: child1.id, schoolId: school.id, date: today, session: "PM", mark: "PRESENT" },
      { childId: child2.id, schoolId: school.id, date: today, session: "AM", mark: "PRESENT" },
      { childId: child2.id, schoolId: school.id, date: today, session: "PM", mark: "LATE", note: "Arrived at 1:15pm" },
    ],
  });

  // Create sample payment item
  await prisma.paymentItem.create({
    data: {
      schoolId: school.id,
      title: "School Trip - Science Museum",
      description: "Year 2 and Year 5 joint trip to the Science Museum",
      amount: 1500, // £15.00
      dueDate: new Date("2026-03-01"),
      category: "TRIP",
      children: {
        create: [{ childId: child1.id }, { childId: child2.id }],
      },
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Update package.json with seed config**

Add to `packages/db/package.json` scripts:

```json
"db:seed": "tsx prisma/seed.ts"
```

Add to `packages/db/package.json` devDependencies:

```json
"tsx": "^4.19.0"
```

Add to `packages/db/package.json` top level:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

**Step 3: Run seed**

```bash
pnpm install
pnpm --filter @schoolconnect/db db:seed
```

**Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: add database seed script with sample school, users, and data"
```

---

## Summary

After completing all 10 tasks, the project structure will be:

```
schoolconnect/
├── apps/
│   ├── api/          # Fastify + tRPC API server
│   ├── web/          # Next.js web application
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── db/           # Prisma schema + client
│   └── tsconfig/     # Shared TypeScript configs
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── biome.json
└── .github/workflows/ci.yml
```

**What's ready after this plan:**
- Monorepo with turborepo + pnpm
- PostgreSQL database with full schema for all Phase 1 entities
- API server with tRPC (type-safe end-to-end)
- Web app shell (Next.js + Tailwind)
- Mobile app shell (Expo)
- Docker Compose for local dev
- CI pipeline
- Seed data for development

**What comes next (separate plan):**
- Authentication (better-auth integration)
- Messaging feature (CRUD + notifications)
- Payments feature (Stripe Connect)
- Attendance feature
- Full-text search (Elasticsearch)
- Multi-child dashboard UI
