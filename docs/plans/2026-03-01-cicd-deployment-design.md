# CI/CD Deployment Pipeline Design

**Date:** 2026-03-01
**Status:** Approved
**Issue:** Forgejo #2

## Decision

Deploy SchoolConnect to **Vercel (web) + Railway (API + DB + Redis)** with CI/CD driven entirely from **Forgejo Actions** on the self-hosted NAS runner.

## Architecture

```
Push to main (Forgejo)
  → CI: lint → test → build → e2e
  → All pass? → CD:
      ├── vercel --prod (web)
      └── railway up (API)

PR opened/updated (Forgejo)
  → CI: lint → test → build
  → CD:
      ├── vercel deploy (preview URL)
      └── Comment preview URL on PR
```

## Environments

| Environment | Trigger | Web | API | DB |
|-------------|---------|-----|-----|----|
| Production | Push to `main` (after CI) | Vercel `--prod` | Railway production service | Railway Postgres (production) |
| Preview | PR events | Vercel preview deploy | Shared dev API | Railway Postgres (production, read-only or shared) |

No permanent staging. PR previews serve as ephemeral review environments.

## Platform Details

### Web — Vercel

- Deploy via `vercel` CLI from Forgejo runner
- Next.js standalone output (already configured)
- Build arg: `NEXT_PUBLIC_API_URL` → Railway API URL
- Custom domain: `app.schoolconnect.co.uk` (or similar)
- PR previews: automatic unique URL per deploy
- Tier: Free → Pro when needed ($20/mo)

### API — Railway

- Deploy via `railway up` CLI using existing `apps/api/Dockerfile`
- Multi-stage Docker build (already production-ready)
- Managed PostgreSQL add-on (automatic daily backups on paid tier)
- Managed Redis add-on (via Upstash or Railway native)
- Zero-downtime deploys (Railway handles rolling updates)
- Custom domain: `api.schoolconnect.co.uk`
- Tier: Starter ($5/mo credit included)

### Database Migrations

Run `prisma migrate deploy` as a pre-deploy step in the CD workflow before the API service restarts. This ensures schema changes apply before new code goes live.

### Elasticsearch

Not included in initial deployment. Search features work without it in degraded mode. Can add Bonsai (free tier) or self-host on NAS later if needed.

## Forgejo Workflow Changes

Modify `.forgejo/workflows/ci.yml` to add two deploy jobs:

### `deploy-web` job
- Depends on: `e2e-web` (only runs if all CI passes)
- Trigger: push to `main` OR pull_request
- Steps:
  1. Install Vercel CLI (`npm i -g vercel`)
  2. Pull Vercel env (`vercel pull --yes`)
  3. Build (`vercel build` for prod, `vercel build` for preview)
  4. Deploy (`vercel deploy --prebuilt --prod` for main, `vercel deploy --prebuilt` for PR)
  5. On PR: comment preview URL via Forgejo API

### `deploy-api` job
- Depends on: `e2e-web` (only runs if all CI passes)
- Trigger: push to `main` only (no PR preview for API)
- Steps:
  1. Install Railway CLI
  2. Run `prisma migrate deploy` against production DB
  3. Deploy via `railway up` using existing Dockerfile

## Secrets Required (Forgejo Repo Secrets)

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel team/org identifier |
| `VERCEL_PROJECT_ID` | Vercel project identifier |
| `RAILWAY_TOKEN` | Railway CLI authentication |
| `DATABASE_URL` | Production Postgres connection string |
| `BETTER_AUTH_SECRET` | Production auth secret |
| `BETTER_AUTH_URL` | Production auth URL |
| `RESEND_API_KEY` | Email service |
| `STRIPE_SECRET_KEY` | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `SENTRY_DSN` | Error monitoring |

## Estimated Costs

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Free (Hobby) | $0 |
| Railway (API + DB + Redis) | Starter | ~$5-10 |
| **Total** | | **~$5-10/mo** |

Note: Vercel Hobby tier has commercial use restrictions. Upgrade to Pro ($20/mo) once serving real schools.

## Rollback Strategy

- **Web**: Vercel keeps deployment history. Rollback via `vercel rollback` or dashboard.
- **API**: Railway keeps deployment history. Rollback via dashboard or redeploy previous commit.
- **DB**: Railway Postgres has daily backups. Point-in-time recovery on paid tier.

## Future Considerations

- Add Elasticsearch (Bonsai free tier or self-hosted) when search is needed
- Upgrade Vercel to Pro for commercial use
- Add health check endpoints for uptime monitoring
- Consider Railway environments for proper staging if needed
