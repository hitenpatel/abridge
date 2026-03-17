# Abridge Infrastructure Guide

**Last Updated:** 2026-03-16

This guide covers deployment, scaling, security testing, and cost management for Abridge at every stage — from solo developer to 100+ schools.

---

## Table of Contents

1. [Security Testing (Free/Low-Cost)](#1-security-testing-freelow-cost)
2. [Infrastructure Stages](#2-infrastructure-stages)
3. [Stage 1: Pre-Revenue (~£5/month)](#3-stage-1-pre-revenue)
4. [Stage 2: Pilot Schools (~£50/month)](#4-stage-2-pilot-schools)
5. [Stage 3: Growth (~£200/month)](#5-stage-3-growth)
6. [Stage 4: Scale (Self-Hosted)](#6-stage-4-scale)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Docker Compose (Local Development)](#8-docker-compose-local-development)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Backup & Disaster Recovery](#10-backup--disaster-recovery)
11. [GDPR & Data Compliance](#11-gdpr--data-compliance)

---

## 1. Security Testing (Free/Low-Cost)

Before production, run these checks. They cost nothing (or very little) and cover most of what a £10k pen test would find.

### Automated Scanning (Free)

#### OWASP ZAP — Dynamic Application Security Testing

Scans your running application for XSS, SQL injection, CSRF, insecure headers, and 100+ other vulnerabilities.

```bash
# Install
brew install zaproxy  # macOS
# OR download from https://www.zaproxy.org/download/

# Run against staging (not production!)
zap-cli quick-scan --self-contained --start-options '-config api.disablekey=true' \
  http://your-staging-url.com

# Full scan with spider (crawls all pages)
zap-cli open-url http://your-staging-url.com
zap-cli spider http://your-staging-url.com
zap-cli active-scan http://your-staging-url.com
zap-cli report -o zap-report.html -f html
```

**What it catches:** XSS, SQL injection, CSRF, missing security headers, insecure cookies, directory traversal, information disclosure.

**Run frequency:** Before every major release and monthly in CI.

#### Snyk — Dependency Vulnerability Scanning

Scans your `package.json` and `pnpm-lock.yaml` for known vulnerabilities in dependencies.

```bash
# Install
npm install -g snyk

# Authenticate (free account)
snyk auth

# Scan the monorepo
snyk test --all-projects

# Monitor (sends alerts when new CVEs affect your deps)
snyk monitor --all-projects
```

**Add to CI** (`.github/workflows/ci.yml`):
```yaml
- name: Snyk security scan
  run: npx snyk test --all-projects
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Free tier:** 200 tests/month, unlimited projects.

#### Mozilla Observatory — HTTP Security Headers

Grades your web application's HTTP security headers (A+ to F).

```bash
# Scan via CLI
npx observatory-cli your-staging-url.com

# Or visit: https://observatory.mozilla.org
```

**Target grade:** A+ (requires Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy). Your Helmet config already sets most of these.

#### npm audit

Built into npm/pnpm — checks for known vulnerabilities.

```bash
npx pnpm audit
```

### Low-Cost Certification

#### NCSC Cyber Essentials (~£300)

UK government-backed cybersecurity certification. Schools recognise and trust this. It covers:
- Firewalls and internet gateways
- Secure configuration
- User access control
- Malware protection
- Patch management

**Process:** Self-assessment questionnaire → assessor review → certificate.

**Apply at:** https://www.ncsc.gov.uk/cyberessentials/overview

**Why it matters for schools:** Many UK schools require Cyber Essentials from software vendors. Having it differentiates you from competitors who don't.

### Free Expert Review Options

#### University Security Students

UK universities with cybersecurity MSc programmes need real-world projects for dissertations and coursework. Contact:
- Royal Holloway (Information Security Group)
- University of Bristol (Cyber Security)
- University of Edinburgh (Security & Privacy)
- Lancaster University (Security Lancaster)

**Offer:** Free access to a staging environment + documentation. They get a real-world project; you get a security review.

#### Bug Bounty (Private, Pay-on-Find)

Set up a private bug bounty programme — only invited researchers can participate. You only pay when they find something.

- **HackerOne** — free to set up private programme
- **Bugcrowd** — same model
- **Intigriti** — European-focused

**Typical bounties for a school app:**
- Low severity: £50-100
- Medium: £100-250
- High: £250-500
- Critical: £500-1000

Most school apps get 0-3 findings. Budget £500 maximum.

### What You've Already Done (Internal Audit)

Your codebase has already been hardened:
- All 16 tRPC routers security-audited
- Input validation (max lengths) on every string field
- Authorization checks (parent-child ownership, school scoping)
- IDOR fixes (cross-school access prevented)
- Rate limiting on AI endpoints
- Credentials stripped from API responses
- Token format validation on invitations
- Helmet security headers configured
- CORS properly scoped

This internal audit is more thorough than what most competitors have done.

### Recommended Security Testing Checklist

```markdown
Before Production:
- [ ] Run OWASP ZAP scan against staging — fix all High/Medium findings
- [ ] Run Snyk on all packages — fix all Critical/High vulnerabilities
- [ ] Check Mozilla Observatory score — achieve A or A+
- [ ] Run npm audit — zero critical vulnerabilities
- [ ] Apply for Cyber Essentials certification (~£300)
- [ ] Set up Snyk monitoring in CI for ongoing alerts
- [ ] Review GDPR compliance checklist (section 11)

Nice to Have:
- [ ] Contact 1-2 university security programmes
- [ ] Set up private bug bounty on HackerOne
- [ ] Conduct a tabletop exercise (what happens if X is breached?)
```

---

## 2. Infrastructure Stages

The key principle: **never pay for capacity you don't use.** Every service has a free or cheap tier that handles pilot scale. Scale up only when revenue justifies it.

| Stage | Schools | Revenue | Infra Cost | Margin |
|-------|---------|---------|------------|--------|
| 1. Pre-Revenue | 0 | £0 | ~£5/month | N/A |
| 2. Pilot | 1-5 | £500-2500/year | ~£50/month | 88-97% |
| 3. Growth | 10-50 | £5k-50k/year | ~£200/month | 95-97% |
| 4. Scale | 100+ | £100k+/year | ~£500/month | 94%+ |

**Pricing model for schools:** £500-2000/year per school depending on size (typical UK school app pricing). Even at Stage 2 with one school paying £500/year, your infrastructure cost is £600/year — roughly break-even. By school #2, you're profitable.

---

## 3. Stage 1: Pre-Revenue (~£5/month)

For development, demos, and initial school conversations.

### Services

| Component | Service | Plan | Cost | Limits |
|-----------|---------|------|------|--------|
| Web (Next.js) | Vercel | Hobby | £0 | 100GB bandwidth, serverless |
| API (Fastify) | Railway | Hobby | £5/month | 500 hrs execution, 1GB RAM |
| Database | Neon | Free | £0 | 0.5GB storage, autosuspend after 5 min |
| Redis (cache) | Upstash | Free | £0 | 10k commands/day |
| File Storage | Cloudflare R2 | Free | £0 | 10GB storage, 1M requests |
| Email | Resend | Free | £0 | 100 emails/day, 1 domain |
| Push Notifications | Expo | Free | £0 | Unlimited |
| Monitoring | Sentry | Developer | £0 | 5k errors/month |
| AI Summaries | Template mode | — | £0 | No AI calls |
| DNS/CDN | Cloudflare | Free | £0 | |

**Total: ~£5/month**

### Setup

#### Vercel (Web)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from apps/web
cd apps/web
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-api.railway.app
```

#### Railway (API)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy from apps/api
railway up

# Set environment variables in Railway dashboard
```

#### Neon (Database)

1. Sign up at https://neon.tech
2. Create a project (region: eu-west-1 for UK)
3. Copy the connection string
4. Set as `DATABASE_URL` in Railway

```
DATABASE_URL=postgresql://user:password@ep-xxx.eu-west-1.aws.neon.tech/abridge?sslmode=require
```

**Important:** Neon Free autosuspends after 5 minutes of inactivity. First request after suspension takes ~1-2 seconds (cold start). This is fine for demos but not for production.

#### Upstash (Redis)

1. Sign up at https://upstash.com
2. Create a Redis database (region: eu-west-1)
3. Copy the REST URL and token
4. Set as `REDIS_URL` in Railway

#### Cloudflare R2 (File Storage)

1. Sign up at https://cloudflare.com
2. Create an R2 bucket named `abridge-media`
3. Create an API token with R2 read/write permissions
4. Set environment variables:
```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=abridge-media
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

#### Resend (Email)

1. Sign up at https://resend.com
2. Add and verify your domain
3. Create an API key
4. Set `RESEND_API_KEY` in Railway

### Stage 1 `.env` Template

```bash
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-west-1.aws.neon.tech/abridge?sslmode=require

# Auth
BETTER_AUTH_SECRET=generate-a-64-char-random-string
BETTER_AUTH_URL=https://your-api.railway.app
SETUP_KEY=your-school-setup-key

# Web
WEB_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-api.railway.app

# Redis (Upstash)
REDIS_URL=https://eu1-xxx.upstash.io
REDIS_TOKEN=your-upstash-token

# Email (Resend)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=hello@yourdomain.com

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=abridge-media
R2_PUBLIC_URL=https://your-bucket.r2.dev

# AI (template mode = free)
AI_SUMMARY_PROVIDER=template

# Monitoring (Sentry)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 4. Stage 2: Pilot Schools (~£50/month)

When you have 1-5 paying schools. Focus: reliability and AI features.

### Changes from Stage 1

| Component | Change | Why | Cost Delta |
|-----------|--------|-----|-----------|
| Database | Neon Free → Neon Pro | No autosuspend, more storage (10GB), more connections | +£19/month |
| API | Railway Hobby → Pro | More compute, no sleep, custom domains | +£15/month |
| AI | Template → Claude Haiku | Enable AI progress summaries | +£2-10/month |
| Email | Keep Resend Free | 100/day is enough for 5 schools | £0 |

**Total: ~£40-50/month**

### Enable AI Features

```bash
# In Railway environment variables:
AI_SUMMARY_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxx

# OR use a cheaper provider:
AI_SUMMARY_PROVIDER=openai
AI_API_KEY=your-key
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.1-8b-instant
# Groq free tier: 14.4k tokens/min — enough for ~50 summaries/week
```

### Custom Domain

Set up a custom domain for the web app and API:
- Web: `app.abridge.school` → Vercel
- API: `api.abridge.school` → Railway

### Automated Backups

Neon Pro includes point-in-time recovery (PITR). Additionally:

```bash
# Weekly backup script (run via cron or Railway cron job)
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
# Upload to R2 for storage
```

---

## 5. Stage 3: Growth (~£200/month)

When you have 10-50 schools. Focus: performance and support.

### Changes from Stage 2

| Component | Change | Why | Cost Delta |
|-----------|--------|-----|-----------|
| Database | Neon Pro → Scale | More connections (100+), more storage, read replicas | +£50/month |
| API | Railway Pro → Dedicated | Consistent performance, 2GB RAM | +£50/month |
| Email | Resend Free → Pro | More emails (50k/month) | +£20/month |
| Redis | Upstash Free → Pay-as-you-go | More commands for caching | +£5/month |
| File Storage | R2 paid tier | More storage for galleries | +£5/month |
| Monitoring | Sentry Team | More events, better alerts | +£26/month |

**Total: ~£150-200/month**

### Performance Optimisations

At this scale, consider:

1. **Connection pooling:** Neon provides PgBouncer. Set `?pgbouncer=true` in the connection string for serverless.

2. **CDN for static assets:** Cloudflare in front of Vercel (already free tier).

3. **Redis caching strategy:**
   - Cache staff membership lookups (already done)
   - Cache feature toggles per school (5 min TTL)
   - Cache timetable data (changes infrequently)

4. **Database indexes:** Review slow query logs monthly. Add indexes for common query patterns.

5. **API rate limiting:** Already configured via `@fastify/rate-limit`. Adjust limits based on real usage patterns.

### Horizontal Scaling Considerations

At 50+ schools, you may need multiple API instances:

- **WebSocket:** Add Redis pub/sub for cross-instance message delivery (see chat PRD)
- **Cron jobs:** Add Postgres advisory locks to prevent duplicate execution
- **Sessions:** Already stored in DB (better-auth), so stateless API instances work

---

## 6. Stage 4: Scale (Self-Hosted, 100+ Schools)

When revenue justifies dedicated infrastructure. Major cost reduction.

### Why Self-Host?

At 100+ schools, managed services become expensive:
- Railway dedicated: £100+/month
- Neon Scale: £100+/month
- Total managed: £300-500/month

A single Hetzner VPS with equivalent specs costs £20-40/month.

### Hetzner VPS Setup

```bash
# Recommended: Hetzner CPX31
# 4 vCPU, 8GB RAM, 160GB SSD, 20TB traffic
# Cost: ~€15/month (~£13)

# With managed PostgreSQL add-on: ~€25/month total
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/abridge
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.abridge.school
    restart: always

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    environment:
      - POSTGRES_DB=abridge
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - api
      - web
    restart: always

volumes:
  pgdata:
  redisdata:
  caddy_data:
```

### Caddyfile (Reverse Proxy + Auto HTTPS)

```
api.abridge.school {
    reverse_proxy api:4000
}

app.abridge.school {
    reverse_proxy web:3000
}
```

### Automated Backups (Self-Hosted)

```bash
#!/bin/bash
# /opt/abridge/backup.sh — run daily via cron

BACKUP_DIR=/opt/abridge/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Database
docker exec abridge-db pg_dump -U postgres abridge | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Keep last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# Optional: upload to R2 for offsite backup
# aws s3 cp "$BACKUP_DIR/db-$DATE.sql.gz" s3://abridge-backups/ --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```

Add to crontab:
```
0 2 * * * /opt/abridge/backup.sh
```

### Self-Hosted Monitoring

Replace Sentry with free self-hosted alternatives:
- **Uptime:** UptimeKuma (self-hosted, Docker)
- **Logs:** Loki + Grafana (self-hosted)
- **Metrics:** Prometheus + Grafana (self-hosted)

Or keep Sentry Free tier — 5k errors/month is usually enough.

---

## 7. Environment Variables Reference

### Required (All Stages)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/abridge` |
| `BETTER_AUTH_SECRET` | Auth session encryption key (64+ chars) | `generate-random-64-char-string` |
| `BETTER_AUTH_URL` | API base URL for auth | `https://api.abridge.school` |
| `SETUP_KEY` | Key for initial school setup | `your-secret-setup-key` |
| `WEB_URL` | Web app URL (for Stripe redirects) | `https://app.abridge.school` |
| `NEXT_PUBLIC_API_URL` | API URL (used by web client) | `https://api.abridge.school` |

### Optional (Feature-Dependent)

| Variable | Feature | Default | Example |
|----------|---------|---------|---------|
| `REDIS_URL` | Staff cache, sessions | None (falls back to DB) | `redis://localhost:6379` |
| `RESEND_API_KEY` | Email notifications | None (emails disabled) | `re_xxxxx` |
| `FROM_EMAIL` | Email sender address | `noreply@abridge.school` | `hello@abridge.school` |
| `STRIPE_SECRET_KEY` | Payments | None (payments disabled) | `sk_live_xxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | None | `whsec_xxxxx` |
| `SENTRY_DSN` | Error monitoring | None (no monitoring) | `https://xxx@sentry.io/xxx` |
| `R2_ACCOUNT_ID` | File uploads (gallery) | None (uploads disabled) | `abc123` |
| `R2_ACCESS_KEY_ID` | File uploads | None | `xxxxx` |
| `R2_SECRET_ACCESS_KEY` | File uploads | None | `xxxxx` |
| `R2_BUCKET_NAME` | File uploads | None | `abridge-media` |
| `R2_PUBLIC_URL` | File viewing | None | `https://media.abridge.school` |

### AI Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `AI_SUMMARY_PROVIDER` | AI provider selection | `template` | `claude`, `openai`, `template` |
| `ANTHROPIC_API_KEY` | Claude API key | None | `sk-ant-xxxxx` |
| `AI_API_KEY` | OpenAI-compatible API key | None | `sk-xxxxx` or `gsk_xxxxx` |
| `AI_BASE_URL` | OpenAI-compatible base URL | `https://api.openai.com/v1` | See provider table |
| `AI_MODEL` | Model override | Provider-specific | `claude-haiku-4-5-20251001`, `gpt-4o-mini`, `llama3` |
| `MAX_WEEKLY_TOKENS` | Budget cap per school/week | `500000` | Any integer |
| `SUMMARY_CRON_HOUR` | Weekly summary cron hour (Mon) | `6` | `0`-`23` |
| `PAYMENT_REMINDER_HOUR` | Daily reminder check hour | `9` | `0`-`23` |

### AI Provider Examples

| Provider | AI_SUMMARY_PROVIDER | AI_API_KEY | AI_BASE_URL | AI_MODEL | Cost |
|----------|-------------------|------------|-------------|----------|------|
| **Free (no AI)** | `template` | — | — | — | £0 |
| **Groq (free tier)** | `openai` | `gsk_xxx` | `https://api.groq.com/openai/v1` | `llama-3.1-8b-instant` | £0 |
| **Ollama (local)** | `openai` | — | `http://localhost:11434/v1` | `llama3` | £0 (your hardware) |
| **Claude Haiku** | `claude` | `sk-ant-xxx` | — | `claude-haiku-4-5-20251001` | ~£0.50/school/month |
| **OpenAI** | `openai` | `sk-xxx` | — | `gpt-4o-mini` | ~£1/school/month |
| **Gemini** | `openai` | `your-key` | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` | ~£0.50/school/month |

---

## 8. Docker Compose (Local Development)

For local development, run PostgreSQL and Redis via Docker:

```yaml
# docker-compose.yml (project root)
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: abridge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
# Start services
docker compose up -d

# Local .env for apps/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/abridge
REDIS_URL=redis://localhost:6379

# Push schema + seed
npx pnpm --filter @schoolconnect/db db:migrate
npx pnpm --filter @schoolconnect/db db:seed

# Start dev servers
npx pnpm dev
```

---

## 9. Monitoring & Alerting

### Sentry (Error Tracking)

Already configured. Key settings:

```typescript
// apps/api/src/index.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests traced (keeps within free tier)
});
```

### Health Check Endpoint

Already exists at `GET /trpc/health.check`. Use for uptime monitoring:

- **UptimeRobot** (free, 50 monitors): ping `https://api.abridge.school/trpc/health.check` every 5 minutes
- **Better Uptime** (free tier): same pattern with status page

### Key Metrics to Monitor

| Metric | Alert When | Tool |
|--------|-----------|------|
| API health check fails | 2 consecutive failures | UptimeRobot |
| Error rate > 5% | Sentry alert rule | Sentry |
| Database connection failures | Any occurrence | Sentry |
| AI API failures | > 10 in 1 hour | Sentry |
| Disk usage > 80% | Self-hosted only | Grafana |
| Memory usage > 90% | Self-hosted only | Grafana |

---

## 10. Backup & Disaster Recovery

### Recovery Time Objectives

| Scenario | Target Recovery Time | Strategy |
|----------|---------------------|----------|
| Database corruption | < 1 hour | Neon PITR / pg_dump restore |
| API server crash | < 5 minutes | Railway auto-restart / Docker restart: always |
| Full infrastructure failure | < 4 hours | Redeploy from git + restore DB backup |
| Data deletion (accidental) | < 1 hour | Neon PITR to specific timestamp |

### Backup Schedule

| What | Frequency | Retention | Where |
|------|-----------|-----------|-------|
| Database (pg_dump) | Daily | 30 days | R2 bucket |
| Database (Neon PITR) | Continuous | 7 days (free) / 30 days (pro) | Neon |
| File uploads (R2) | N/A (already in cloud) | Indefinite | Cloudflare R2 |
| Git repository | Every push | Indefinite | Forgejo + GitHub mirror |

---

## 11. GDPR & Data Compliance

### Requirements for UK Schools

Schools processing children's data must comply with UK GDPR and the Children's Code (Age Appropriate Design Code).

### What Abridge Does

| Requirement | How Abridge Handles It |
|-------------|----------------------|
| Data minimisation | Only collect what's needed. No tracking pixels. No analytics on children. |
| Purpose limitation | Data used only for school-parent communication. No selling. No advertising. |
| Right to erasure | Admin can delete child records (cascades via Prisma `onDelete: Cascade`) |
| Data portability | PDF export on forms, report cards, conversation history |
| Security | Encryption in transit (HTTPS), at rest (Neon/R2), auth sessions (better-auth) |
| Breach notification | Sentry alerts → notify ICO within 72 hours if personal data breach |
| Data Processing Agreement | Template DPA needed for each school (you are the data processor, school is the controller) |
| Privacy notice | Schools must update their privacy notice to mention Abridge |

### AI Data Processing Disclosure

When AI features are enabled, child data is sent to external AI providers. Schools must:
1. Update their privacy notice to disclose AI processing
2. Conduct a Data Protection Impact Assessment (DPIA) for AI features
3. Consider using Ollama (local AI, no external data transfer) for maximum privacy

### Data Retention Defaults

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Chat messages | 6 years | UK school record-keeping |
| Attendance records | 6 years | Statutory requirement |
| Payment records | 7 years | UK financial regulations |
| Form responses | 6 years | School record-keeping |
| Wellbeing check-ins | 6 years | Safeguarding |
| Progress summaries | 3 years | Educational purposes |
| Media uploads | Until deleted by staff | Storage management |
| User accounts | Until school requests deletion | Data minimisation |

### Checklist Before Pilot

```markdown
- [ ] Draft a Data Processing Agreement (DPA) template
- [ ] Draft a privacy notice template for schools
- [ ] Configure data retention policies in the app
- [ ] Document where data is stored (which services, which regions)
- [ ] Confirm all services are EU/UK hosted (Neon eu-west-1, R2 auto, etc.)
- [ ] Test right-to-erasure workflow (admin deletes child → cascades properly)
- [ ] Test data export (PDF generation for forms, reports, conversations)
```

---

## Cost Summary Table

| Stage | Schools | Monthly Cost | Annual Cost | Break-Even |
|-------|---------|-------------|-------------|------------|
| Pre-Revenue | 0 | £5 | £60 | — |
| Pilot (1 school) | 1 | £50 | £600 | 1 school at £600+/year |
| Pilot (5 schools) | 5 | £50 | £600 | 1 school at £600+/year |
| Growth (20 schools) | 20 | £200 | £2,400 | 3 schools at £800/year |
| Growth (50 schools) | 50 | £200 | £2,400 | 3 schools at £800/year |
| Scale (100+ schools) | 100 | £40 (self-hosted) | £480 | 1 school at £500/year |

**Key insight:** Your infrastructure cost is essentially flat from 5 to 50 schools. All the revenue from school #3 onwards is nearly pure margin.
