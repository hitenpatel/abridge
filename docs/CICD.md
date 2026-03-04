# CI/CD Architecture

SchoolConnect uses a split CI/CD architecture across two platforms, with a push mirror keeping them in sync.

## Platform Split

| Platform | What Runs | Why |
|----------|-----------|-----|
| **Forgejo** (self-hosted) | Lint, unit tests, build, deploy (web + API) | Lightweight jobs, runs on NAS Docker runner |
| **GitHub Actions** | E2E tests (web + mobile) | Needs more resources than NAS AUFS driver can handle |

### Push Mirror

Forgejo auto-syncs to GitHub on every commit via a push mirror. Pushing to Forgejo triggers both:
1. Forgejo CI (lint, test, build, deploy)
2. GitHub Actions (e2e tests via mirror sync)

The mirror is configured in Forgejo repo settings (Settings > Mirror).

## Forgejo CI

**Runner:** Docker runner on Synology NAS (container: `node:24-bookworm`)

**Workflow:** `.forgejo/workflows/ci.yml`

| Job | Trigger | What it does |
|-----|---------|-------------|
| `lint` | push/PR to main | `pnpm lint` (Biome) |
| `test` | push/PR to main | Vitest unit/integration tests |
| `build` | push/PR to main | `pnpm build` |
| `deploy-web` | push to main | Vercel deploy (production or preview) |
| `deploy-api` | push to main | Railway deploy + Prisma migrate |

**Secrets (Forgejo):**
- `GCLOUD_SERVICE_KEY` — Firebase service account JSON
- `FIREBASE_PROJECT_ID` — `abridge-488817`
- `EXPO_TOKEN` — EAS CLI token
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — Vercel deploy
- `RAILWAY_TOKEN` — Railway deploy
- `PRODUCTION_DATABASE_URL` — Production Postgres
- `FORGEJO_TOKEN` — For PR comments

## GitHub Actions

**Runner:** `ubuntu-latest` (GitHub-hosted)

**Workflow:** `.github/workflows/ci.yml`

| Job | Trigger | What it does | Duration |
|-----|---------|-------------|----------|
| `e2e-web` | push/PR to main | Playwright tests (111 tests, Chromium) | ~7 min |
| `e2e-mobile-android` | push/PR to main | EAS Build APK + Firebase Test Lab Robo test | ~21 min |
| `e2e-mobile-ios` | `workflow_dispatch` only | iOS simulator + Maestro (planned) | ~15 min |

**Secrets (GitHub):**
- `GCLOUD_SERVICE_KEY` — Firebase service account JSON
- `FIREBASE_PROJECT_ID` — `abridge-488817`
- `EXPO_TOKEN` — EAS CLI token

### GitHub Actions Free Tier

Private repos get 2,000 minutes/month. Current usage:
- Web e2e: ~7 min/push
- Mobile e2e: ~21 min/push
- iOS (manual): ~150 min billed (15 min real x 10x macOS multiplier)

At ~30 pushes/month: ~840 min for web+android, leaving room for occasional iOS runs.

## E2E Test Stack

### Web (Playwright)
- 29 test files, 111+ test cases
- Runs against real PostgreSQL + API + Next.js servers in CI
- Tests: auth, dashboard, attendance, calendar, messages, forms, payments, settings, search, staff ops, admin journeys, error handling
- Reports uploaded as artifacts on failure

### Mobile — Android (Firebase Test Lab)
- EAS Build creates the APK (detox-test profile)
- Robo test crawls the app on a virtual MediumPhone.arm (API 34)
- Validates app launches and doesn't crash
- Planned: Maestro scripted flows on Android emulator

### Mobile — iOS (Planned)
- Manual trigger only (workflow_dispatch) to conserve macOS minutes
- Build via `expo prebuild` + xcodebuild
- Run Maestro flows on iOS simulator

## Adding Secrets

**Forgejo:**
```bash
curl -X PUT \
  -H "Authorization: token <FORGEJO_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"data":"<value>"}' \
  "https://git.hiten-patel.co.uk/api/v1/repos/hiten/abridge/actions/secrets/<SECRET_NAME>"
```

**GitHub:**
```bash
gh secret set SECRET_NAME --body "value"
```

## Workflow Dispatch

To manually trigger a GitHub Actions run (e.g., for iOS tests):
```bash
gh workflow run ci.yml --ref main
```
