# CI/CD Deployment Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add continuous deployment to the Forgejo CI pipeline — Vercel for web, Railway for API — so pushes to `main` auto-deploy to production and PRs get preview URLs.

**Architecture:** Extend `.forgejo/workflows/ci.yml` with two new jobs (`deploy-web`, `deploy-api`) that depend on existing CI jobs passing. Web deploys via Vercel CLI, API deploys via Railway CLI. PR previews for web only.

**Tech Stack:** Forgejo Actions, Vercel CLI, Railway CLI, Prisma Migrate

**Design Doc:** `docs/plans/2026-03-01-cicd-deployment-design.md`

---

## Prerequisites (Manual Steps — Not Automated)

Before implementing, you need accounts and tokens set up:

### P1: Create Vercel Project

1. Go to https://vercel.com → Sign up / Log in
2. Import project from Git (or create blank project named `schoolconnect-web`)
3. Framework: Next.js, Root directory: `apps/web`
4. Skip first deploy (we'll deploy from Forgejo)
5. Note down: `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from `.vercel/project.json` after running `vercel link` locally
6. Create a token at https://vercel.com/account/tokens → name it `forgejo-deploy`

### P2: Create Railway Project

1. Go to https://railway.app → Sign up / Log in
2. Create new project → name it `schoolconnect`
3. Add PostgreSQL service (auto-provisions, gives you `DATABASE_URL`)
4. Add Redis service (auto-provisions, gives you `REDIS_URL`)
5. Add empty service for the API → name it `api`, connect to repo or use Docker deploy
6. Set environment variables on the API service: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_URL`, `RESEND_API_KEY`, `FROM_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`, `SETUP_KEY`
7. Create a project token at Railway → Settings → Tokens → name it `forgejo-deploy`

### P3: Add Forgejo Repo Secrets

Go to https://git.hiten-patel.co.uk/hiten/abridge/settings → Actions → Secrets, add:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Token from P1 step 6 |
| `VERCEL_ORG_ID` | From `vercel link` output |
| `VERCEL_PROJECT_ID` | From `vercel link` output |
| `RAILWAY_TOKEN` | Token from P2 step 7 |
| `PRODUCTION_DATABASE_URL` | Railway Postgres connection string from P2 |

---

## Task 1: Add Deploy Web Job to Forgejo CI

**Files:**
- Modify: `.forgejo/workflows/ci.yml`

**Step 1: Add the `deploy-web` job after the existing jobs**

Add this job at the end of `.forgejo/workflows/ci.yml`:

```yaml
  deploy-web:
    needs: [lint, test, build, e2e-web]
    runs-on: docker
    container: node:24-bookworm
    steps:
      - uses: https://code.forgejo.org/actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build with Vercel
        run: vercel build ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }})
          echo "DEPLOY_URL=$URL" >> "$GITHUB_OUTPUT"
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment preview URL on PR
        if: github.event_name == 'pull_request'
        run: |
          curl -s -X POST \
            "https://git.hiten-patel.co.uk/api/v1/repos/${{ github.repository }}/issues/${{ github.event.pull_request.number }}/comments" \
            -H "Authorization: token ${{ secrets.FORGEJO_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d "{\"body\": \"🚀 Preview deployed: ${{ steps.deploy.outputs.DEPLOY_URL }}\"}"
```

**Step 2: Verify the YAML is valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.forgejo/workflows/ci.yml'))" && echo "Valid YAML"`

Expected: `Valid YAML`

**Step 3: Commit**

```bash
git add .forgejo/workflows/ci.yml
git commit -m "ci: add Vercel web deploy job to Forgejo pipeline"
```

---

## Task 2: Add Deploy API Job to Forgejo CI

**Files:**
- Modify: `.forgejo/workflows/ci.yml`

**Step 1: Add the `deploy-api` job**

Add this job at the end of `.forgejo/workflows/ci.yml` (after `deploy-web`):

```yaml
  deploy-api:
    if: github.ref == 'refs/heads/main'
    needs: [lint, test, build, e2e-web]
    runs-on: docker
    container: node:24-bookworm
    steps:
      - uses: https://code.forgejo.org/actions/checkout@v4

      - name: Setup pnpm
        run: |
          corepack enable
          corepack prepare pnpm@9.15.0 --activate

      - run: pnpm install --frozen-lockfile

      - name: Run database migrations
        run: |
          cd packages/db
          pnpm exec prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}

      - name: Install Railway CLI and deploy
        run: |
          curl -fsSL https://railway.com/install.sh | sh
          cd apps/api
          railway up --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Step 2: Verify YAML is valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.forgejo/workflows/ci.yml'))" && echo "Valid YAML"`

Expected: `Valid YAML`

**Step 3: Commit**

```bash
git add .forgejo/workflows/ci.yml
git commit -m "ci: add Railway API deploy job to Forgejo pipeline"
```

---

## Task 3: Add FORGEJO_TOKEN Secret for PR Comments

The `deploy-web` job needs a Forgejo API token to comment preview URLs on PRs.

**Step 1: Create a Forgejo API token (manual)**

This is the token you already have: `8b107168a66fd94737fecb53deca1f339380bbaf`

Add it as a repo secret named `FORGEJO_TOKEN` at:
`https://git.hiten-patel.co.uk/hiten/abridge/settings` → Actions → Secrets

**Step 2: Verify it's set**

```bash
curl -s "https://git.hiten-patel.co.uk/api/v1/repos/hiten/abridge" \
  -H "Authorization: token 8b107168a66fd94737fecb53deca1f339380bbaf" | python3 -c "import sys,json; print('OK' if json.load(sys.stdin).get('name') else 'FAIL')"
```

Expected: `OK`

---

## Task 4: Add Health Check Endpoint for Railway

Railway uses health checks to know when the deploy is ready. The API already has a tRPC health check, but Railway needs a plain HTTP endpoint.

**Files:**
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/src/__tests__/health.test.ts` (if exists, otherwise verify manually)

**Step 1: Check if a plain `/health` route already exists**

Read `apps/api/src/index.ts` and search for `/health`. The tRPC route is at `/trpc/health.check` which is fine for the app, but Railway needs a simple `GET /health` that returns 200.

**Step 2: Add plain health route if needed**

Add before the `server.listen` call in `apps/api/src/index.ts`:

```typescript
server.get("/health", async () => {
  return { status: "ok" };
});
```

**Step 3: Verify the health endpoint works**

Run: `curl -s http://localhost:4000/health` (with dev server running)

Expected: `{"status":"ok"}`

**Step 4: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat: add plain /health endpoint for Railway health checks"
```

---

## Task 5: Add Railway Configuration File

**Files:**
- Create: `apps/api/railway.toml`

**Step 1: Create Railway config**

```toml
[build]
dockerfilePath = "../../Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Note: Railway needs the Dockerfile path relative to the service root. Since the Dockerfile is at `apps/api/Dockerfile` and expects to be built from the repo root, we may need to configure Railway to use the repo root as build context. If Railway supports `watchPatterns`, add:

```toml
[build]
dockerfilePath = "apps/api/Dockerfile"
watchPatterns = ["apps/api/**", "packages/db/**", "packages/tsconfig/**", "pnpm-lock.yaml"]
```

**Step 2: Commit**

```bash
git add apps/api/railway.toml
git commit -m "ci: add Railway deployment configuration"
```

---

## Task 6: Update Forgejo Issue and Push

**Step 1: Push the branch to Forgejo**

```bash
git push origin main
```

**Step 2: Close the Forgejo issue via API**

```bash
curl -s -X PATCH "https://git.hiten-patel.co.uk/api/v1/repos/hiten/abridge/issues/2" \
  -H "Authorization: token 8b107168a66fd94737fecb53deca1f339380bbaf" \
  -H "Content-Type: application/json" \
  -d '{"state": "closed"}'
```

**Step 3: Add a comment summarizing what was done**

```bash
curl -s -X POST "https://git.hiten-patel.co.uk/api/v1/repos/hiten/abridge/issues/2/comments" \
  -H "Authorization: token 8b107168a66fd94737fecb53deca1f339380bbaf" \
  -H "Content-Type: application/json" \
  -d '{"body": "Implemented: Forgejo CI/CD pipeline with Vercel (web) + Railway (API). Production deploys on push to main, PR preview URLs for web."}'
```

---

## Verification Checklist

After the prerequisites (P1-P3) are done and code is pushed:

- [ ] Push to `main` triggers Forgejo CI
- [ ] CI jobs all pass (lint, test, build, e2e)
- [ ] `deploy-web` job runs and deploys to Vercel production
- [ ] `deploy-api` job runs, migrates DB, deploys to Railway
- [ ] Opening a PR triggers preview deploy and comments URL
- [ ] `https://your-domain.vercel.app` loads the web app
- [ ] `https://your-railway-url.up.railway.app/health` returns `{"status":"ok"}`
- [ ] Web app can communicate with API (CORS, env vars correct)
