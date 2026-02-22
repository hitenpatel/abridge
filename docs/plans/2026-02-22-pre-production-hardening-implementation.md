# Pre-Production Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden SchoolConnect for pilot deployment with rate limiting, security headers, Sentry error tracking, structured logging (Pino), expanded health checks, and k6 load testing targeting 500 concurrent users.

**Architecture:** Replace the custom Logger with Fastify-native Pino. Add `@fastify/rate-limit` (Redis-backed) and `@fastify/helmet` for API security. Integrate `@sentry/node` for API and `@sentry/nextjs` for web error tracking. Add Next.js security headers. Expand the health check to report dependency status. Create a `packages/load-test/` package with k6 scripts.

**Tech Stack:** Fastify 5, Pino, Sentry, `@fastify/rate-limit`, `@fastify/helmet`, Next.js headers config, k6

**Design doc:** `docs/plans/2026-02-22-pre-production-hardening-design.md`

---

## Task 1: Install Pino dev dependency and configure Fastify logger

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/index.ts`

**Step 1: Install pino-pretty for dev output**

```bash
npx pnpm --filter @schoolconnect/api add -D pino-pretty
```

Expected: package.json updated with pino-pretty in devDependencies.

**Step 2: Configure Fastify logger with Pino options**

In `apps/api/src/index.ts`, replace line 16:

```typescript
const server = Fastify({ logger: true });
```

with:

```typescript
const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
    ...(process.env.NODE_ENV !== "production" && {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    }),
  },
});
```

**Step 3: Verify dev server starts with pretty logging**

```bash
npx pnpm --filter @schoolconnect/api dev
```

Expected: Server starts with colorized, human-readable log output.

**Step 4: Commit**

```bash
git add apps/api/package.json apps/api/src/index.ts pnpm-lock.yaml
git commit -m "feat: configure Pino structured logging with pretty-print in dev"
```

---

## Task 2: Replace custom Logger with Fastify logger across the codebase

**Files:**
- Delete: `apps/api/src/lib/logger.ts`
- Modify: `apps/api/src/lib/redis.ts`
- Modify: `apps/api/src/lib/auth.ts`
- Modify: `apps/api/src/lib/session-helper.ts`
- Modify: `apps/api/src/router/auth.ts`
- Modify: `apps/api/src/router/invitation.ts`
- Modify: `apps/api/src/services/email.ts`

**Step 1: Create a Pino child logger export that works outside Fastify request context**

Create `apps/api/src/lib/logger.ts` (overwrite existing) with:

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});
```

This keeps the `import { logger } from "./logger"` import path identical — no changes needed in the 6 files that import it. The `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()` signatures are compatible with Pino's API.

**Step 2: Install pino as a runtime dependency**

```bash
npx pnpm --filter @schoolconnect/api add pino
```

**Step 3: Fix the `logger.error` call signature differences**

The custom Logger used `logger.error(message, error, context)` but Pino uses `logger.error({ err, ...context }, message)`. Update all call sites:

In `apps/api/src/lib/redis.ts`, replace all `logger.error("...", err as Error)` calls with:

```typescript
logger.error({ err }, "Redis get error");
```

Pattern: find all `logger.error("message", err)` and change to `logger.error({ err }, "message")`.

In `apps/api/src/services/email.ts`, same pattern.

**Step 4: Remove console.log/warn/error calls from files that don't use the logger**

These files use raw `console.*` instead of the logger. Replace with logger imports:

- `apps/api/src/services/translation.ts` — `console.warn` and `console.error` → `logger.warn` / `logger.error`
- `apps/api/src/services/notification.ts` — `console.error` → `logger.error`
- `apps/api/src/services/sms.ts` — `console.error` → `logger.error`
- `apps/api/src/services/ocr.ts` — `console.error` → `logger.error`
- `apps/api/src/services/translator.ts` — `console.error` / `console.log` → `logger.error` / `logger.info`
- `apps/api/src/router/messaging.ts` — `console.error` → `logger.error`
- `apps/api/src/router/forms.ts` — `console.error` → `logger.error`
- `apps/api/src/router/db-init.ts` — `console.log` → `logger.info`
- `apps/api/src/lib/stripe.ts` — `console.error` → `logger.error`
- `apps/api/src/jobs/notification-fallback.ts` — `console.error` → `logger.error`
- `apps/api/src/index.ts` line 147 — `console.error` → `logger.error`

Add `import { logger } from "../lib/logger";` (or `"./logger"` for lib files) to each file that doesn't already have it.

**Step 5: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

Expected: Build succeeds.

**Step 6: Run tests**

```bash
npx pnpm --filter @schoolconnect/api test
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add apps/api/src/
git commit -m "refactor: replace custom Logger and console calls with Pino"
```

---

## Task 3: Install and configure Sentry for the API

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/lib/sentry.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Install Sentry**

```bash
npx pnpm --filter @schoolconnect/api add @sentry/node @sentry/profiling-node
```

**Step 2: Create Sentry initialization module**

Create `apps/api/src/lib/sentry.ts`:

```typescript
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    beforeSend(event) {
      // Don't send client errors (4xx) to Sentry
      if (event.exception?.values?.[0]?.type === "TRPCError") {
        const message = event.exception.values[0].value || "";
        if (
          message.includes("UNAUTHORIZED") ||
          message.includes("NOT_FOUND") ||
          message.includes("BAD_REQUEST") ||
          message.includes("FORBIDDEN")
        ) {
          return null;
        }
      }
      return event;
    },
  });
}

export { Sentry };
```

**Step 3: Initialize Sentry before Fastify starts**

In `apps/api/src/index.ts`, add at the very top (before all other imports):

```typescript
import { initSentry, Sentry } from "./lib/sentry";
initSentry();
```

Add Sentry user context to the tRPC context. In `apps/api/src/context.ts`, after the session lookup:

```typescript
import { Sentry } from "./lib/sentry";

// Inside createContext, after session lookup:
if (session?.user) {
  Sentry.setUser({ id: session.user.id, email: session.user.email });
} else {
  Sentry.setUser(null);
}
```

**Step 4: Add Sentry to the global error handler**

In `apps/api/src/index.ts`, update the `main().catch` at the bottom:

```typescript
main().catch((err) => {
  Sentry.captureException(err);
  server.log.error(err);
  process.exit(1);
});
```

And replace the `checkUndeliveredNotifications` catch:

```typescript
checkUndeliveredNotifications(prisma).catch((err) => {
  Sentry.captureException(err);
  server.log.error({ err }, "Notification fallback job failed");
});
```

**Step 5: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

Expected: Build succeeds.

**Step 6: Commit**

```bash
git add apps/api/src/lib/sentry.ts apps/api/src/index.ts apps/api/src/context.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add Sentry error tracking and profiling to API"
```

---

## Task 4: Install and configure Sentry for the web app

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.mjs`
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/global-error.tsx`

**Step 1: Install Sentry for Next.js**

```bash
npx pnpm --filter @schoolconnect/web add @sentry/nextjs
```

**Step 2: Create Sentry client config**

Create `apps/web/sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
});
```

**Step 3: Create Sentry server config**

Create `apps/web/sentry.server.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
```

**Step 4: Wrap Next.js config with Sentry**

Update `apps/web/next.config.mjs`:

```javascript
import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@schoolconnect/db"],
  turbopack: {
    root: "../..",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

const sentryConfig = withSentryConfig(pwaConfig(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
});

export default sentryConfig;
```

**Step 5: Add global error boundary**

Create `apps/web/src/app/global-error.tsx`:

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We've been notified and are looking into it.</p>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**Step 6: Run build to verify**

```bash
npx pnpm --filter @schoolconnect/web build
```

Expected: Build succeeds (Sentry source map upload skipped without auth token).

**Step 7: Commit**

```bash
git add apps/web/sentry.client.config.ts apps/web/sentry.server.config.ts apps/web/src/app/global-error.tsx apps/web/next.config.mjs apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add Sentry error tracking and error boundary to web app"
```

---

## Task 5: Install and configure rate limiting

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/index.ts`

**Step 1: Install rate limit plugin**

```bash
npx pnpm --filter @schoolconnect/api add @fastify/rate-limit
```

**Step 2: Register rate limiting in index.ts**

In `apps/api/src/index.ts`, add the import at the top:

```typescript
import rateLimit from "@fastify/rate-limit";
```

Inside the `main()` function, register rate limiting **after** cookie but **before** CORS (after line 57):

```typescript
// Global rate limit: 100 req/min per IP
await server.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  redis: (() => {
    try {
      const { getRedisClient } = require("./lib/redis");
      return getRedisClient();
    } catch {
      return undefined;
    }
  })(),
});
```

**Step 3: Add stricter rate limits to auth routes**

In the auth route handler (the `server.route` block around line 84), add route-level rate limit config:

```typescript
server.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "15 minutes",
    },
  },
  async handler(request, reply) {
    // ... existing handler
  },
});
```

**Step 4: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add rate limiting with Redis backend and stricter auth limits"
```

---

## Task 6: Install and configure security headers (API)

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/index.ts`

**Step 1: Install Helmet**

```bash
npx pnpm --filter @schoolconnect/api add @fastify/helmet
```

**Step 2: Register Helmet in index.ts**

Add import:

```typescript
import helmet from "@fastify/helmet";
```

Inside `main()`, register **after** rate limiting, **before** CORS:

```typescript
await server.register(helmet, {
  contentSecurityPolicy: false, // CSP handled by Next.js for web
  crossOriginEmbedderPolicy: false, // Allow embedding (needed for Stripe)
});
```

**Step 3: Run dev server and verify headers**

```bash
npx pnpm --filter @schoolconnect/api dev
```

Then in another terminal:

```bash
curl -I http://localhost:4000/trpc/health.check
```

Expected: Response includes `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `strict-transport-security` headers.

**Step 4: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add Helmet security headers to API"
```

---

## Task 7: Add security headers to Next.js web app

**Files:**
- Modify: `apps/web/next.config.mjs`

**Step 1: Add security headers to Next.js config**

In `apps/web/next.config.mjs`, add a `headers` function to `nextConfig`:

```javascript
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@schoolconnect/db"],
  turbopack: {
    root: "../..",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};
```

**Step 2: Run build to verify**

```bash
npx pnpm --filter @schoolconnect/web build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/web/next.config.mjs
git commit -m "feat: add security headers to Next.js web app"
```

---

## Task 8: Expand health check with dependency status

**Files:**
- Modify: `apps/api/src/router/health.ts`
- Modify: `apps/api/src/__tests__/health.test.ts`

**Step 1: Write the failing test**

Replace `apps/api/src/__tests__/health.test.ts` with:

```typescript
import { describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { appRouter } from "../router";

function createTestContext(overrides?: Partial<Context>): Context {
  return {
    prisma: {
      $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    } as unknown as Context["prisma"],
    req: {} as Context["req"],
    res: {} as Context["res"],
    user: null,
    session: null,
    ...overrides,
  };
}

describe("health router", () => {
  it("returns healthy status with dependency info", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.health.check();

    expect(result.status).toBe("healthy");
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.dependencies.database).toBeDefined();
    expect(result.dependencies.database.status).toBe("up");
    expect(result.dependencies.database.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns degraded when optional deps are down", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.health.check();

    // Redis and ES may be down in test environment — status should be healthy or degraded, not unhealthy
    expect(["healthy", "degraded"]).toContain(result.status);
  });

  it("returns unhealthy when database is down", async () => {
    const ctx = createTestContext({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(new Error("Connection refused")),
      } as unknown as Context["prisma"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.health.check();

    expect(result.status).toBe("unhealthy");
    expect(result.dependencies.database.status).toBe("down");
    expect(result.dependencies.database.error).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx pnpm --filter @schoolconnect/api test -- --run src/__tests__/health.test.ts
```

Expected: Tests fail because health.check doesn't return the new shape.

**Step 3: Implement the expanded health check**

Replace `apps/api/src/router/health.ts` with:

```typescript
import { publicProcedure, router } from "../trpc";
import { getRedisClient } from "../lib/redis";

const startTime = Date.now();

async function checkDatabase(prisma: { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> }) {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up" as const, latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down" as const, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function checkRedis() {
  const start = Date.now();
  try {
    const client = getRedisClient();
    if (!client) {
      return { status: "down" as const, latencyMs: 0, error: "Not configured" };
    }
    await client.ping();
    return { status: "up" as const, latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "down" as const, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

export const healthRouter = router({
  check: publicProcedure.query(async ({ ctx }) => {
    const [database, redis] = await Promise.all([
      checkDatabase(ctx.prisma),
      checkRedis(),
    ]);

    const dependencies = { database, redis };

    let status: "healthy" | "degraded" | "unhealthy";
    if (database.status === "down") {
      status = "unhealthy";
    } else if (redis.status === "down") {
      status = "degraded";
    } else {
      status = "healthy";
    }

    return {
      status,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      dependencies,
    };
  }),
});
```

**Step 4: Run tests to verify they pass**

```bash
npx pnpm --filter @schoolconnect/api test -- --run src/__tests__/health.test.ts
```

Expected: All 3 tests pass.

**Step 5: Run full test suite**

```bash
npx pnpm --filter @schoolconnect/api test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add apps/api/src/router/health.ts apps/api/src/__tests__/health.test.ts
git commit -m "feat: expand health check with database and Redis dependency status"
```

---

## Task 9: Configure database connection pooling

**Files:**
- Modify: `packages/db/src/index.ts` (or wherever PrismaClient is instantiated)

**Step 1: Find where PrismaClient is instantiated**

Check `packages/db/src/index.ts` and update the Prisma connection to respect `DATABASE_POOL_SIZE`:

```typescript
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const poolSize = process.env.DATABASE_POOL_SIZE;

// Append connection_limit to the URL if specified
const url = poolSize && databaseUrl && !databaseUrl.includes("connection_limit")
  ? `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}connection_limit=${poolSize}`
  : databaseUrl;

export const prisma = new PrismaClient({
  datasourceUrl: url,
});

export * from "@prisma/client";
```

**Step 2: Verify the app still starts**

```bash
npx pnpm --filter @schoolconnect/api dev
```

Expected: Server starts normally with default pool size.

**Step 3: Commit**

```bash
git add packages/db/src/index.ts
git commit -m "feat: add configurable database connection pool size via DATABASE_POOL_SIZE"
```

---

## Task 10: Create k6 load test package and smoke test

**Files:**
- Create: `packages/load-test/package.json`
- Create: `packages/load-test/scripts/smoke.js`
- Create: `packages/load-test/scripts/helpers.js`

**Step 1: Create the package**

Create `packages/load-test/package.json`:

```json
{
  "name": "@schoolconnect/load-test",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "smoke": "k6 run scripts/smoke.js",
    "auth": "k6 run scripts/auth.js",
    "dashboard": "k6 run scripts/dashboard.js",
    "messaging": "k6 run scripts/messaging.js",
    "payments": "k6 run scripts/payments.js",
    "mixed": "k6 run scripts/mixed.js",
    "stress": "k6 run scripts/stress.js"
  }
}
```

**Step 2: Create shared helpers**

Create `packages/load-test/scripts/helpers.js`:

```javascript
import http from "k6/http";

export const BASE_URL = __ENV.API_BASE_URL || "http://localhost:4000";

export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (res.status !== 200) {
    console.error(`Login failed for ${email}: ${res.status} ${res.body}`);
    return null;
  }

  const cookies = res.cookies;
  const sessionCookie = cookies["better-auth.session_token"];
  if (!sessionCookie || !sessionCookie[0]) {
    console.error(`No session cookie for ${email}`);
    return null;
  }

  return {
    cookie: `better-auth.session_token=${sessionCookie[0].value}`,
  };
}

export function trpcQuery(path, input, authCookie) {
  const inputParam = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
  return http.get(`${BASE_URL}/trpc/${path}${inputParam}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authCookie ? { Cookie: authCookie } : {}),
    },
  });
}

export function trpcMutation(path, input, authCookie) {
  return http.post(
    `${BASE_URL}/trpc/${path}`,
    JSON.stringify(input),
    {
      headers: {
        "Content-Type": "application/json",
        ...(authCookie ? { Cookie: authCookie } : {}),
      },
    },
  );
}
```

**Step 3: Create the smoke test**

Create `packages/load-test/scripts/smoke.js`:

```javascript
import { check } from "k6";
import { trpcQuery, BASE_URL } from "./helpers.js";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = trpcQuery("health.check");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has status field": (r) => {
      const body = JSON.parse(r.body);
      return body.result?.data?.status !== undefined;
    },
  });
}
```

**Step 4: Verify k6 runs (requires k6 installed locally)**

```bash
cd packages/load-test && k6 run scripts/smoke.js --duration 5s --vus 1
```

Expected: k6 runs and reports metrics. (If k6 not installed, document the install step: `brew install k6`.)

**Step 5: Commit**

```bash
git add packages/load-test/
git commit -m "feat: add k6 load test package with smoke test and helpers"
```

---

## Task 11: Add k6 auth and dashboard load tests

**Files:**
- Create: `packages/load-test/scripts/auth.js`
- Create: `packages/load-test/scripts/dashboard.js`

**Step 1: Create auth load test**

Create `packages/load-test/scripts/auth.js`:

```javascript
import { check, sleep } from "k6";
import http from "k6/http";
import { BASE_URL, login } from "./helpers.js";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Attempt login with test credentials
  const email = `parent${(__VU % 100)}@loadtest.com`;
  const password = "LoadTest123!";

  const res = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  check(res, {
    "login returns 200 or 401": (r) => r.status === 200 || r.status === 401,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Step 2: Create dashboard load test**

Create `packages/load-test/scripts/dashboard.js`:

```javascript
import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  // Login once during setup
  const session = login("parent0@loadtest.com", "LoadTest123!");
  return { cookie: session?.cookie };
}

export default function (data) {
  if (!data.cookie) {
    console.error("No auth cookie — skipping iteration");
    sleep(1);
    return;
  }

  // Fetch dashboard summary
  const summary = trpcQuery("dashboard.getSummary", undefined, data.cookie);
  check(summary, {
    "dashboard summary 200": (r) => r.status === 200,
  });

  // Fetch children list
  const children = trpcQuery("user.listChildren", undefined, data.cookie);
  check(children, {
    "children list 200": (r) => r.status === 200,
  });

  sleep(0.5);
}
```

**Step 3: Commit**

```bash
git add packages/load-test/scripts/auth.js packages/load-test/scripts/dashboard.js
git commit -m "feat: add k6 auth and dashboard load test scripts"
```

---

## Task 12: Add k6 messaging, payments, mixed, and stress tests

**Files:**
- Create: `packages/load-test/scripts/messaging.js`
- Create: `packages/load-test/scripts/payments.js`
- Create: `packages/load-test/scripts/mixed.js`
- Create: `packages/load-test/scripts/stress.js`

**Step 1: Create messaging load test**

Create `packages/load-test/scripts/messaging.js`:

```javascript
import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  const session = login("parent0@loadtest.com", "LoadTest123!");
  return { cookie: session?.cookie };
}

export default function (data) {
  if (!data.cookie) {
    sleep(1);
    return;
  }

  const received = trpcQuery(
    "messaging.listReceived",
    { limit: 20 },
    data.cookie,
  );
  check(received, {
    "received messages 200": (r) => r.status === 200,
  });

  const conversations = trpcQuery(
    "messaging.listConversations",
    { limit: 20 },
    data.cookie,
  );
  check(conversations, {
    "conversations 200": (r) => r.status === 200,
  });

  sleep(0.5);
}
```

**Step 2: Create payments load test**

Create `packages/load-test/scripts/payments.js`:

```javascript
import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  const session = login("parent0@loadtest.com", "LoadTest123!");
  return { cookie: session?.cookie };
}

export default function (data) {
  if (!data.cookie) {
    sleep(1);
    return;
  }

  const outstanding = trpcQuery(
    "payments.listOutstandingPayments",
    undefined,
    data.cookie,
  );
  check(outstanding, {
    "outstanding payments 200": (r) => r.status === 200,
  });

  const history = trpcQuery(
    "payments.getPaymentHistory",
    { limit: 20 },
    data.cookie,
  );
  check(history, {
    "payment history 200": (r) => r.status === 200,
  });

  sleep(0.5);
}
```

**Step 3: Create mixed workload test**

Create `packages/load-test/scripts/mixed.js`:

```javascript
import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
  stages: [
    { duration: "1m", target: 500 },
    { duration: "3m", target: 500 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    http_req_failed: ["rate<0.01"],
    http_reqs: ["rate>100"],
  },
};

export function setup() {
  const session = login("parent0@loadtest.com", "LoadTest123!");
  return { cookie: session?.cookie };
}

export default function (data) {
  if (!data.cookie) {
    sleep(1);
    return;
  }

  // Simulate realistic user behavior distribution
  const rand = Math.random();

  if (rand < 0.3) {
    // 30% dashboard views
    trpcQuery("dashboard.getSummary", undefined, data.cookie);
  } else if (rand < 0.55) {
    // 25% messaging
    trpcQuery("messaging.listReceived", { limit: 20 }, data.cookie);
  } else if (rand < 0.7) {
    // 15% attendance
    trpcQuery("user.listChildren", undefined, data.cookie);
  } else if (rand < 0.85) {
    // 15% payments
    trpcQuery("payments.listOutstandingPayments", undefined, data.cookie);
  } else if (rand < 0.95) {
    // 10% health check (simulates monitoring)
    const res = trpcQuery("health.check");
    check(res, { "health 200": (r) => r.status === 200 });
  } else {
    // 5% conversations
    trpcQuery("messaging.listConversations", { limit: 20 }, data.cookie);
  }

  sleep(0.3 + Math.random() * 0.7);
}
```

**Step 4: Create stress test**

Create `packages/load-test/scripts/stress.js`:

```javascript
import { check, sleep } from "k6";
import { login, trpcQuery } from "./helpers.js";

export const options = {
  stages: [
    { duration: "1m", target: 500 },
    { duration: "2m", target: 500 },
    { duration: "1m", target: 1000 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  const session = login("parent0@loadtest.com", "LoadTest123!");
  return { cookie: session?.cookie };
}

export default function (data) {
  if (!data.cookie) {
    sleep(1);
    return;
  }

  const rand = Math.random();

  if (rand < 0.4) {
    trpcQuery("dashboard.getSummary", undefined, data.cookie);
  } else if (rand < 0.7) {
    trpcQuery("messaging.listReceived", { limit: 20 }, data.cookie);
  } else {
    trpcQuery("health.check");
  }

  sleep(0.2 + Math.random() * 0.5);
}
```

**Step 5: Commit**

```bash
git add packages/load-test/scripts/
git commit -m "feat: add k6 messaging, payments, mixed workload, and stress test scripts"
```

---

## Task 13: Add load test seed script

**Files:**
- Create: `packages/load-test/scripts/seed-load-test-data.ts`

**Step 1: Create the seed script**

Create `packages/load-test/scripts/seed-load-test-data.ts`:

```typescript
/**
 * Seeds the database with load test data.
 * Run with: npx tsx packages/load-test/scripts/seed-load-test-data.ts
 *
 * Creates:
 * - 10 schools
 * - 2 staff per school (1 admin, 1 teacher)
 * - 50 parents per school (500 total)
 * - 2 children per parent (1000 total)
 * - 5 messages per school (50 total)
 */
import { PrismaClient } from "@schoolconnect/db";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding load test data...");

  const password = await hashPassword("LoadTest123!");

  for (let s = 0; s < 10; s++) {
    console.log(`Creating school ${s + 1}/10...`);

    const school = await prisma.school.create({
      data: {
        name: `Load Test School ${s}`,
        address: `${s} Test Street`,
        phone: `0700000000${s}`,
        ofstedUrn: `LT${String(s).padStart(6, "0")}`,
        messagingEnabled: true,
        paymentsEnabled: true,
        attendanceEnabled: true,
        calendarEnabled: true,
        formsEnabled: true,
        translationEnabled: true,
        parentsEveningEnabled: true,
      },
    });

    // Create admin
    const admin = await prisma.user.create({
      data: {
        email: `admin${s}@loadtest.com`,
        name: `Admin ${s}`,
        emailVerified: true,
      },
    });
    await prisma.account.create({
      data: {
        userId: admin.id,
        accountId: admin.id,
        providerId: "credential",
        password,
      },
    });
    await prisma.staffMember.create({
      data: { userId: admin.id, schoolId: school.id, role: "ADMIN" },
    });

    // Create teacher
    const teacher = await prisma.user.create({
      data: {
        email: `teacher${s}@loadtest.com`,
        name: `Teacher ${s}`,
        emailVerified: true,
      },
    });
    await prisma.account.create({
      data: {
        userId: teacher.id,
        accountId: teacher.id,
        providerId: "credential",
        password,
      },
    });
    await prisma.staffMember.create({
      data: { userId: teacher.id, schoolId: school.id, role: "TEACHER" },
    });

    // Create parents and children
    for (let p = 0; p < 50; p++) {
      const parentIdx = s * 50 + p;
      const parent = await prisma.user.create({
        data: {
          email: `parent${parentIdx}@loadtest.com`,
          name: `Parent ${parentIdx}`,
          emailVerified: true,
        },
      });
      await prisma.account.create({
        data: {
          userId: parent.id,
          accountId: parent.id,
          providerId: "credential",
          password,
        },
      });

      // 2 children per parent
      for (let c = 0; c < 2; c++) {
        const child = await prisma.child.create({
          data: {
            firstName: `Child${c}`,
            lastName: `Parent${parentIdx}`,
            dateOfBirth: new Date(2018, 0, 1),
            yearGroup: `Year ${(c % 6) + 1}`,
            schoolId: school.id,
          },
        });
        await prisma.parentChild.create({
          data: { userId: parent.id, childId: child.id },
        });
      }
    }

    // Create 5 broadcast messages per school
    for (let m = 0; m < 5; m++) {
      await prisma.message.create({
        data: {
          schoolId: school.id,
          subject: `Load Test Message ${m}`,
          body: `This is load test message ${m} for school ${s}.`,
          category: "STANDARD",
          type: "BROADCAST",
          authorId: admin.id,
        },
      });
    }
  }

  console.log("Load test data seeded successfully!");
  console.log("  10 schools, 20 staff, 500 parents, 1000 children, 50 messages");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Test the seed script**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx tsx packages/load-test/scripts/seed-load-test-data.ts
```

Expected: Script runs and prints success message.

**Step 3: Commit**

```bash
git add packages/load-test/
git commit -m "feat: add load test seed script for 10 schools, 500 parents, 1000 children"
```

---

## Task 14: Lint, build, and full test suite

**Step 1: Run linter**

```bash
npx pnpm lint
```

Fix any issues, then:

```bash
npx pnpm lint:fix
```

**Step 2: Run full build**

```bash
npx pnpm build
```

Expected: All packages build successfully.

**Step 3: Run all tests**

```bash
npx pnpm test
```

Expected: All tests pass.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: lint fixes for pre-production hardening"
```
