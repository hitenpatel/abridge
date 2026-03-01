# Deployment Setup

## 1. Vercel (Web App)

### Create project

```bash
npm i -g vercel
vercel login
cd apps/web
vercel link
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No** (creates new)
- Project name: `schoolconnect-web` (or your preference)
- Directory where code is located: `./` (i.e. `apps/web`)

### Get credentials

```bash
# After linking, these are in apps/web/.vercel/project.json
cat apps/web/.vercel/project.json
# → { "orgId": "...", "projectId": "..." }

# Create a deploy token at https://vercel.com/account/tokens
# Scope: full account, no expiry (or set one)
```

### Set environment variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your production API URL (e.g. `https://api.schoolconnect.example.com`) |

### Add secrets to Forgejo

Go to `https://git.hiten-patel.co.uk/hiten/abridge/settings/actions/secrets` and add:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Token from Vercel account settings |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
| `FORGEJO_TOKEN` | A Forgejo API token (for PR preview comments) |

---

## 2. Railway (API)

### Create project

```bash
npm i -g @railway/cli
railway login
cd apps/api
railway init
```

When prompted:
- Project name: `schoolconnect-api` (or your preference)

### Add PostgreSQL

```bash
railway add --plugin postgresql
```

Or via the Railway dashboard: Project → New → Database → PostgreSQL.

### Set environment variables in Railway

Go to your Railway project → API service → Variables and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL plugin |
| `BETTER_AUTH_SECRET` | A strong random string (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Your production API URL (e.g. `https://api.schoolconnect.example.com`) |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `SETUP_KEY` | A secret key for initial school setup |
| `CORS_ORIGINS` | Your Vercel production URL (e.g. `https://schoolconnect-web.vercel.app`) |

### Get credentials

```bash
# Create a project token in Railway dashboard:
# Project → Settings → Tokens → Create Token

# Get the production DATABASE_URL:
# Project → PostgreSQL service → Connect → Connection String
```

### Add secrets to Forgejo

Go to `https://git.hiten-patel.co.uk/hiten/abridge/settings/actions/secrets` and add:

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | Project token from Railway |
| `PRODUCTION_DATABASE_URL` | PostgreSQL connection string from Railway |

---

## 3. Verify

After adding all secrets, push a commit to `main`. The CI pipeline should:

1. Run lint, test, build, e2e-web as before
2. `deploy-web` → builds and deploys to Vercel (production on main, preview on PRs)
3. `deploy-api` → runs Prisma migrations and deploys to Railway (main only)

### Check deployment

```bash
# Vercel
curl https://schoolconnect-web.vercel.app

# Railway
curl https://your-railway-url.up.railway.app/trpc/health.check
```

---

## Summary of Forgejo Secrets

| Secret | Service | Required for |
|---|---|---|
| `VERCEL_TOKEN` | Vercel | `deploy-web` |
| `VERCEL_ORG_ID` | Vercel | `deploy-web` |
| `VERCEL_PROJECT_ID` | Vercel | `deploy-web` |
| `FORGEJO_TOKEN` | Forgejo | PR preview comments |
| `RAILWAY_TOKEN` | Railway | `deploy-api` |
| `PRODUCTION_DATABASE_URL` | Railway PostgreSQL | `deploy-api` (migrations) |
