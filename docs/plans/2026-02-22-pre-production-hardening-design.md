# Pre-Production Hardening Design: Security, Monitoring, Load Testing

**Date:** 2026-02-22
**Status:** Approved
**Target scale:** 5-10 schools (~500 concurrent users)

---

## Overview

Four workstreams to make SchoolConnect production-ready for pilot deployment:

1. **Security Hardening** — Rate limiting + security headers via Fastify plugins and Next.js config
2. **Error Tracking** — Sentry for API and web, with user/school context
3. **Structured Logging** — Replace custom Logger with Pino (Fastify-native), JSON output
4. **Load Testing** — k6 scripts targeting 500 concurrent users with pass/fail thresholds

Plus an expanded health check endpoint for dependency monitoring.

---

## 1. Security Hardening

### Approach

Use Fastify ecosystem plugins (`@fastify/rate-limit`, `@fastify/helmet`) for the API. Use Next.js `headers` config for the web app. No reverse proxy or custom middleware needed.

### Rate Limiting

Backend: `@fastify/rate-limit` with Redis store (falls back to in-memory when Redis unavailable — matches existing graceful fallback pattern).

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| Global API | 100 req | 1 min | IP |
| Auth login | 5 req | 15 min | IP + email |
| Auth register | 3 req | 15 min | IP |
| tRPC mutations | 30 req | 1 min | User ID |
| tRPC queries | 60 req | 1 min | User ID |
| Translation | 10 req | 1 min | User ID |
| File upload | 5 req | 1 min | User ID |

Rate limit responses return `429 Too Many Requests` with `Retry-After` header.

### Security Headers — API (`@fastify/helmet`)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
- `X-XSS-Protection: 0` (defer to CSP)

### Security Headers — Web (`next.config.ts`)

- `Content-Security-Policy`: self + trusted origins (API URL, Sentry, Stripe)
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: disable camera, microphone, geolocation

---

## 2. Error Tracking (Sentry)

### API (`@sentry/node` + `@sentry/profiling-node`)

- Initialize before Fastify starts
- Capture all unhandled exceptions + unhandled rejections
- tRPC error handler sends non-client errors to Sentry (skip NOT_FOUND, UNAUTHORIZED, BAD_REQUEST)
- Performance tracing on tRPC procedures (sample rate: 20% in production)
- Attach user context (userId, schoolId) to events
- Environment tags: `production`, `staging`, `development`

### Web (`@sentry/nextjs`)

- Error boundary wrapping the app layout
- Client-side error capture (React render errors, unhandled promises)
- Performance tracing on page navigations (sample rate: 10%)
- Source map upload during build

### New Env Vars

- `SENTRY_DSN` — Sentry project DSN
- `SENTRY_AUTH_TOKEN` — for source map uploads (build-time only)

---

## 3. Structured Logging (Pino)

### Approach

Replace the custom `Logger` class (`apps/api/src/lib/logger.ts`) with Fastify's built-in Pino logger.

### Configuration

- JSON output in production, pretty-print in development (`pino-pretty` dev dependency)
- Log level controlled via `LOG_LEVEL` env var (default: `info` in prod, `debug` in dev)
- Request logging: method, URL, status code, response time
- Add `schoolId` and `userId` to log context where available via Fastify request decorators
- Remove all `console.log`, `console.warn`, `console.error` calls across the API codebase

### New Env Vars

- `LOG_LEVEL` — Pino log level (`debug`, `info`, `warn`, `error`)

---

## 4. Load Testing (k6)

### Setup

- New package: `packages/load-test/`
- Scripts in JavaScript (k6 runtime requirement)
- Seed script variant for load test data (10 schools, 500 parents, 1000 children)

### Test Scenarios

| Scenario | VUs | Duration | What it tests |
|----------|-----|----------|---------------|
| Smoke | 5 | 30s | Basic health — does it work? |
| Auth flow | 50 | 2min | Login + session creation throughput |
| Parent dashboard | 100 | 3min | Dashboard summary + children + attendance |
| Messaging | 100 | 3min | List received + list sent + mark read |
| Payments | 50 | 2min | List outstanding + payment history |
| Mixed workload | 500 | 5min | All flows combined, realistic distribution |
| Stress | 500→1000 | 5min | Ramp beyond target to find breaking point |

### Pass/Fail Thresholds

- p95 response time < 500ms
- p99 response time < 1,500ms
- Error rate < 1%
- Request throughput > 100 req/s

### Database Connection Pooling

- Configure pool size via `DATABASE_POOL_SIZE` env var (default: 10)
- Load testing with 20-50 connections to find optimal setting
- Set via Prisma `datasources.db.url` connection string parameter `?connection_limit=N`

### Output

- k6 HTML summary report
- JSON output for CI integration

### New Env Vars

- `DATABASE_POOL_SIZE` — Prisma connection pool limit
- `API_BASE_URL` — target URL for k6 scripts (default: `http://localhost:4000`)

---

## 5. Expanded Health Checks

### Approach

Extend the existing `health.check` tRPC procedure to return dependency status.

### Response Shape

```json
{
  "status": "healthy | degraded | unhealthy",
  "uptime": 12345,
  "dependencies": {
    "database": { "status": "up", "latencyMs": 3 },
    "redis": { "status": "up", "latencyMs": 1 },
    "elasticsearch": { "status": "down", "error": "ECONNREFUSED" }
  }
}
```

### Status Logic

- `healthy` — all dependencies up
- `degraded` — optional dependencies down (Redis, Elasticsearch) but database up
- `unhealthy` — database down

Remains a public procedure (no auth required) so load balancers and monitoring tools can hit it.

---

## Implementation Order

| # | Workstream | Rationale |
|---|-----------|-----------|
| 1 | Structured Logging (Pino) | Foundation — needed before everything else to have proper observability |
| 2 | Error Tracking (Sentry) | Builds on logging — captures what logs miss |
| 3 | Security Hardening | Independent — rate limiting + headers |
| 4 | Health Checks | Small scope, ties monitoring together |
| 5 | Load Testing | Last — validates everything else under pressure |

Logging first because Sentry and security changes need proper logging to debug. Load testing last because it validates the whole stack.

---

## What's Explicitly Out of Scope

- Deployment infrastructure (IaC, Kubernetes, cloud provider choice)
- 2FA/MFA (Phase 2 feature)
- CDN configuration (deployment-dependent)
- Database replication (deployment-dependent)
- WCAG accessibility audit (separate workstream)
- Penetration testing (external engagement, not code changes)
