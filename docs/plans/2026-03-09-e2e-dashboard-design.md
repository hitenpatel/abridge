# Abridge E2E Dashboard — Design

## Overview

A static GitHub Pages dashboard showing historic e2e test results across 3 suites: Web (Playwright), Android (Maestro), iOS (Maestro). Deployed automatically after each CI run.

## Architecture

- **Hosting**: GitHub Pages on `gh-pages` branch
- **URL**: `https://hitenpatel.github.io/abridge/`
- **Data**: `history.json` — array of last 50 run objects, stored in `gh-pages` branch
- **Deployment**: New CI job "deploy-dashboard" runs after all 3 e2e jobs (using `if: always()`)
- **No external dependencies**: Single `index.html` with inline CSS/JS, no build step

### CI Flow

1. Each e2e job produces artifacts: JUnit XML (Maestro), Playwright JSON report
2. New "deploy-dashboard" job downloads all artifacts
3. Parses results into a run JSON object (commit, branch, timestamp, duration, per-suite test details)
4. Fetches existing `history.json` from `gh-pages` branch
5. Prepends new run, trims to 50 entries
6. Deploys static site via `actions/deploy-pages`

### Run Data Shape

```json
{
  "id": "22848581526",
  "sha": "ae9e1ce",
  "message": "ci: re-enable web and Android e2e jobs",
  "branch": "main",
  "timestamp": "2026-03-09T10:30:00Z",
  "suites": {
    "web": {
      "status": "pass",
      "passed": 110,
      "failed": 0,
      "total": 110,
      "duration": 245,
      "tests": [
        { "name": "Login flow", "status": "pass", "duration": 3.2 },
        { "name": "Registration", "status": "fail", "duration": 5.1, "error": "...", "screenshot": "base64..." }
      ]
    },
    "android": { ... },
    "ios": { ... }
  }
}
```

Screenshots stored as base64 thumbnails, capped at ~50KB each.

## UI Design

Single-page app, two views (hash routing), dark theme.

### Dashboard View (landing)

- **Header**: "Abridge E2E Dashboard" + last updated timestamp
- **Summary cards**: 3 cards (Web, Android, iOS) — green/red status, pass count, duration
- **Trend chart**: SVG line chart — pass rate % over last 50 runs, one line per suite
- **Run history table**: Row per run — commit (linked), date, branch, 3 suite columns with pass/fail pills. Click row to drill down.

### Run Detail View (click a run)

- **Run header**: Commit SHA, message, date, overall status
- **3 collapsible suite sections**:
  - Suite summary: X/Y passed, duration
  - Test list: name, duration, pass/fail badge
  - Failed tests expanded by default with error message + screenshot thumbnail (click to enlarge)

### Styling

- Dark theme (developer tools aesthetic)
- Monospace for data, sans-serif for labels
- Accent colours: green (#22c55e) pass, red (#ef4444) fail, orange (#f56e3d) Abridge brand
- Responsive — works on mobile

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Add deploy-dashboard job after e2e jobs |
| `dashboard/index.html` | Static SPA — the entire dashboard |
| `dashboard/parse-results.js` | Node script to parse JUnit XML + Playwright JSON into run JSON |
