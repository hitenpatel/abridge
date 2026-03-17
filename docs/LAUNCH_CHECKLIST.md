# Abridge Launch Checklist

A step-by-step guide to go from code-complete to production with your first pilot school.

---

## Step 1: Free Accounts (15 min)

- [ ] Sign up for [Neon](https://neon.tech) — free PostgreSQL database (select eu-west-1 region)
- [ ] Sign up for [Upstash](https://upstash.com) — free Redis (select eu-west-1 region)
- [ ] Sign up for [Resend](https://resend.com) — free email (100/day)
- [ ] Sign up for [Sentry](https://sentry.io) — free error monitoring
- [ ] Sign up for [UptimeRobot](https://uptimerobot.com) — free uptime monitoring
- [ ] Sign up for [Cloudflare](https://cloudflare.com) — free DNS + R2 storage

## Step 2: Domain Setup (15 min)

- [ ] Register domain (e.g. `abridge.school`) or use existing
- [ ] Add domain to Cloudflare (free plan)
- [ ] Create subdomains: `app.abridge.school` (web), `api.abridge.school` (API)

## Step 3: Deploy Stage 1 (30 min)

### Option A: Managed (Vercel + Railway)

- [ ] Deploy web to Vercel: `cd apps/web && npx vercel`
- [ ] Point `app.abridge.school` to Vercel
- [ ] Deploy API to Railway: `npx railway login && npx railway init && npx railway up`
- [ ] Point `api.abridge.school` to Railway
- [ ] Copy `.env.production.example` → set all env vars in Railway dashboard
- [ ] Run migration: `npx railway run npx prisma migrate deploy`
- [ ] Run seed (optional): `npx railway run npx prisma db seed`
- [ ] Verify: visit `https://api.abridge.school/api/docs` (Swagger UI)
- [ ] Verify: visit `https://app.abridge.school` (landing page)

### Option B: Self-Hosted (Docker on VPS)

- [ ] Provision a VPS (Hetzner CPX31 ~£13/month recommended)
- [ ] Install Docker + Docker Compose on the VPS
- [ ] Clone the repo: `git clone your-repo /opt/abridge`
- [ ] Run: `cd /opt/abridge && ./scripts/setup-production.sh`
- [ ] Point DNS records to the VPS IP
- [ ] Verify Caddy auto-generates HTTPS certificates

## Step 4: Configure Services (20 min)

- [ ] Set up Resend: add + verify your domain, create API key
- [ ] Set up Stripe: create account, get API keys, set webhook URL to `https://api.abridge.school/webhook/stripe`
- [ ] Set up Sentry: create project, copy DSN to env vars
- [ ] Set up UptimeRobot: add monitor for `https://api.abridge.school/trpc/health.check`
- [ ] Set up R2: create bucket `abridge-media`, create API token, set env vars

## Step 5: Security Scan (15 min)

- [ ] Run `./scripts/security-scan.sh` — fix any critical findings
- [ ] Check [Mozilla Observatory](https://observatory.mozilla.org) — target A+ grade
- [ ] Run `npx snyk test --all-projects` — fix critical vulnerabilities
- [ ] Verify HTTPS works on both subdomains

## Step 6: Test the Full Flow (30 min)

- [ ] Visit `https://app.abridge.school/setup` — create a test school
- [ ] Register as admin via the setup success page
- [ ] Enable features in Settings (messaging, attendance, payments, etc.)
- [ ] Register a separate parent account
- [ ] Send a test message (staff → parent)
- [ ] Create a test payment item
- [ ] Submit a test form
- [ ] Log a test attendance record
- [ ] Verify email delivery (check Resend dashboard)
- [ ] Verify push notification (if Expo push token set)

## Step 7: Compliance Prep (1-2 hours)

- [ ] Apply for [NCSC Cyber Essentials](https://www.ncsc.gov.uk/cyberessentials/overview) certification (~£300)
- [ ] Draft a Data Processing Agreement (DPA) template for schools
- [ ] Draft a privacy notice template that schools can adapt
- [ ] Document where data is stored (Neon eu-west-1, Cloudflare R2, etc.)
- [ ] Test right-to-erasure: delete a child record, verify cascade works
- [ ] Test data export: download form PDF, report card PDF

## Step 8: Enable AI Features (10 min, optional)

- [ ] Choose a provider (see `docs/INFRASTRUCTURE.md` section 7 for options)
- [ ] Set `AI_SUMMARY_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` in env vars
- [ ] For zero-cost AI: use Groq free tier or local Ollama
- [ ] Verify: enable Progress Summaries toggle in Settings, click "Generate Now"

## Step 9: Onboard First School (1 hour)

- [ ] Create the school via `/setup` with their details (name, URN, admin email)
- [ ] Send the admin their registration link
- [ ] Walk them through enabling features in Settings
- [ ] Help them invite staff (Settings → Staff Management → Invite)
- [ ] Provide parents with the registration URL
- [ ] Set up daily backup cron: `crontab -e` → `0 2 * * * /opt/abridge/scripts/backup.sh`

## Step 10: Monitor (Ongoing)

- [ ] Check Sentry weekly for new errors
- [ ] Check UptimeRobot for downtime alerts
- [ ] Review AI token usage monthly (if enabled)
- [ ] Run `./scripts/security-scan.sh` monthly
- [ ] Review Neon database size quarterly (upgrade when >80% of plan limit)

---

## Quick Reference

| Service | Dashboard URL |
|---------|--------------|
| Vercel | https://vercel.com/dashboard |
| Railway | https://railway.app/dashboard |
| Neon | https://console.neon.tech |
| Upstash | https://console.upstash.com |
| Resend | https://resend.com/emails |
| Sentry | https://sentry.io |
| Cloudflare | https://dash.cloudflare.com |
| Stripe | https://dashboard.stripe.com |
| UptimeRobot | https://dashboard.uptimerobot.com |

## Estimated Timeline

| Step | Time | Blocker? |
|------|------|----------|
| Accounts | 15 min | No |
| Domain | 15 min | Need domain |
| Deploy | 30 min | No |
| Services | 20 min | Need Stripe account |
| Security | 15 min | No |
| Test flow | 30 min | No |
| Compliance | 1-2 hours | Cyber Essentials takes 2-4 weeks to process |
| AI setup | 10 min | Need API key |
| First school | 1 hour | Need a school! |

**Total time to production: ~4 hours** (excluding Cyber Essentials processing time and finding your first school).
