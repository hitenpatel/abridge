# Abridge E2E Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a GitHub Pages dashboard showing historic e2e test results across Web (Playwright), Android (Maestro), and iOS (Maestro) suites with per-test drill-down and failure details.

**Architecture:** A Node.js script (`dashboard/parse-results.js`) parses JUnit XML and Playwright JSON into a run object. A CI job fetches prior history from `gh-pages`, prepends the new run, and deploys a single-file static SPA (`dashboard/index.html`) to GitHub Pages. History capped at 50 runs.

**Tech Stack:** GitHub Pages, GitHub Actions (`actions/deploy-pages`), Node.js (XML parsing with regex — no deps), vanilla HTML/CSS/JS SPA.

---

### Task 1: Update CI to produce parseable test reports

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `playwright.config.ts`

**Step 1: Add JSON reporter to Playwright config**

In `playwright.config.ts`, change the reporter from `"html"` to output both list (for CI logs) and JSON (for dashboard parsing):

```ts
reporter: [["list"], ["json", { outputFile: "playwright-report.json" }]],
```

**Step 2: Update Playwright CI step to use config reporters**

In `.github/workflows/ci.yml`, the e2e-web job currently runs:
```
npx playwright test --reporter=list
```
Change to (so it uses config reporters):
```
npx playwright test
```

**Step 3: Upload Playwright JSON on all runs (not just failure)**

Change the web job's `upload-artifact` from `if: failure()` to `if: always()`, and upload the JSON file:
```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: |
      playwright-report.json
      playwright-report/
    retention-days: 7
```

**Step 4: Upload Maestro screenshots for Android**

The Android job already uploads `maestro-debug/` on `if: always()`. Confirm the debug output directory contains screenshots. No change needed, but verify the artifact name is `maestro-report-android` (currently `maestro-report`). Rename for clarity:
```yaml
name: maestro-report-android
```

**Step 5: Upload Maestro screenshots for iOS**

The iOS job only uploads `maestro-report.xml`. Add the debug output flag and upload screenshots:
```yaml
maestro test apps/mobile/.maestro/ --format junit --output maestro-report.xml --debug-output maestro-debug || MAESTRO_EXIT=$?
```
Update artifact upload:
```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: maestro-report-ios
    path: |
      maestro-report.xml
      maestro-debug/
    retention-days: 7
```

**Step 6: Commit**
```bash
git add .github/workflows/ci.yml playwright.config.ts
git commit -m "ci: add JSON reporter and always-upload artifacts for dashboard"
```

---

### Task 2: Create the JUnit XML + Playwright JSON parser

**Files:**
- Create: `dashboard/parse-results.js`

**Step 1: Write the parser script**

This Node.js script (zero dependencies) does:
1. Reads JUnit XML files (Maestro) and extracts test name, status, duration, error message
2. Reads Playwright JSON and extracts test name, status, duration, error message, screenshot paths
3. Reads Maestro debug screenshots and converts to base64 (capped at 50KB)
4. Outputs a single run JSON object to stdout

The script takes arguments: `--run-id`, `--sha`, `--message`, `--branch`, `--timestamp`
And optional paths: `--playwright <path>`, `--maestro-android <path>`, `--maestro-ios <path>`
And optional screenshot dirs: `--maestro-android-screenshots <path>`, `--maestro-ios-screenshots <path>`

```js
#!/usr/bin/env node
// dashboard/parse-results.js
// Parses Playwright JSON + Maestro JUnit XML into a dashboard run object.
// Zero dependencies — uses regex for XML, built-in JSON for Playwright.

const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] || "";
      i++;
    }
  }
  return args;
}

function parseJunitXml(xmlPath) {
  if (!xmlPath || !fs.existsSync(xmlPath)) {
    return null;
  }
  const xml = fs.readFileSync(xmlPath, "utf8");
  const tests = [];
  let passed = 0;
  let failed = 0;
  let totalDuration = 0;

  // Match each <testcase> element
  const testcaseRegex = /<testcase\s+([^>]*)>([\s\S]*?)<\/testcase>|<testcase\s+([^>]*)\/>/g;
  let match;
  while ((match = testcaseRegex.exec(xml)) !== null) {
    const attrs = match[1] || match[3] || "";
    const body = match[2] || "";

    const name = (attrs.match(/name="([^"]*)"/) || [])[1] || "Unknown";
    const time = parseFloat((attrs.match(/time="([^"]*)"/) || [])[1] || "0");
    totalDuration += time;

    const hasFailure = /<failure/.test(body);
    const hasError = /<error/.test(body);
    const isFailed = hasFailure || hasError;

    let error = null;
    if (isFailed) {
      const msgMatch = body.match(/message="([^"]*)"/);
      if (msgMatch) error = msgMatch[1];
      else {
        const textMatch = body.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
        if (textMatch) error = textMatch[1].trim().slice(0, 500);
      }
      failed++;
    } else {
      passed++;
    }

    tests.push({
      name,
      status: isFailed ? "fail" : "pass",
      duration: Math.round(time * 10) / 10,
      ...(error && { error }),
    });
  }

  return {
    status: failed === 0 ? "pass" : "fail",
    passed,
    failed,
    total: passed + failed,
    duration: Math.round(totalDuration),
    tests,
  };
}

function parsePlaywrightJson(jsonPath) {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const tests = [];
  let passed = 0;
  let failed = 0;
  let totalDuration = 0;

  function walkSuites(suites) {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              const duration = (result.duration || 0) / 1000;
              totalDuration += duration;
              const status = result.status === "passed" ? "pass" : "fail";
              if (status === "pass") passed++;
              else failed++;

              let error = null;
              if (status === "fail" && result.error) {
                error = (result.error.message || result.error.snippet || "").slice(0, 500);
              }

              // Check for screenshot attachments
              let screenshot = null;
              if (result.attachments) {
                const ss = result.attachments.find(
                  (a) => a.name === "screenshot" && a.path
                );
                if (ss && ss.path && fs.existsSync(ss.path)) {
                  const buf = fs.readFileSync(ss.path);
                  if (buf.length <= 50000) {
                    screenshot = `data:image/png;base64,${buf.toString("base64")}`;
                  }
                }
              }

              tests.push({
                name: spec.title,
                status,
                duration: Math.round(duration * 10) / 10,
                ...(error && { error }),
                ...(screenshot && { screenshot }),
              });
            }
          }
        }
      }
      if (suite.suites) walkSuites(suite.suites);
    }
  }

  walkSuites(data.suites || []);

  return {
    status: failed === 0 ? "pass" : "fail",
    passed,
    failed,
    total: passed + failed,
    duration: Math.round(totalDuration),
    tests,
  };
}

function loadMaestroScreenshots(screenshotDir, tests) {
  if (!screenshotDir || !fs.existsSync(screenshotDir)) return;
  // Maestro debug output puts screenshots in flow-name directories
  try {
    const dirs = fs.readdirSync(screenshotDir);
    for (const dir of dirs) {
      const fullDir = path.join(screenshotDir, dir);
      if (!fs.statSync(fullDir).isDirectory()) continue;
      const pngs = fs.readdirSync(fullDir).filter((f) => f.endsWith(".png"));
      if (pngs.length === 0) continue;
      // Use last screenshot (usually failure state)
      const lastPng = pngs[pngs.length - 1];
      const buf = fs.readFileSync(path.join(fullDir, lastPng));
      if (buf.length > 50000) continue;
      const b64 = `data:image/png;base64,${buf.toString("base64")}`;
      // Match to failed test by flow name
      const flowName = dir.replace(/-/g, " ").toLowerCase();
      for (const test of tests) {
        if (
          test.status === "fail" &&
          test.name.toLowerCase().includes(flowName)
        ) {
          test.screenshot = b64;
        }
      }
    }
  } catch (e) {
    // Non-fatal
  }
}

const args = parseArgs();

const run = {
  id: args["run-id"] || "unknown",
  sha: (args.sha || "unknown").slice(0, 7),
  message: (args.message || "").slice(0, 120),
  branch: args.branch || "main",
  timestamp: args.timestamp || new Date().toISOString(),
  suites: {},
};

// Parse web (Playwright)
const web = parsePlaywrightJson(args.playwright);
if (web) run.suites.web = web;

// Parse Android (Maestro JUnit)
const android = parseJunitXml(args["maestro-android"]);
if (android) {
  loadMaestroScreenshots(args["maestro-android-screenshots"], android.tests);
  run.suites.android = android;
}

// Parse iOS (Maestro JUnit)
const ios = parseJunitXml(args["maestro-ios"]);
if (ios) {
  loadMaestroScreenshots(args["maestro-ios-screenshots"], ios.tests);
  run.suites.ios = ios;
}

// If a suite didn't run (job failed before tests), mark as skipped
for (const suite of ["web", "android", "ios"]) {
  if (!run.suites[suite]) {
    run.suites[suite] = {
      status: "skip",
      passed: 0,
      failed: 0,
      total: 0,
      duration: 0,
      tests: [],
    };
  }
}

console.log(JSON.stringify(run, null, 2));
```

**Step 2: Test locally with a sample JUnit XML**

Create a quick test:
```bash
echo '<testsuite><testcase name="Login Flow" time="54.2"></testcase><testcase name="Register" time="27.1"><failure message="timeout"/></testcase></testsuite>' > /tmp/test.xml
node dashboard/parse-results.js --run-id 123 --sha abc1234 --message "test" --maestro-ios /tmp/test.xml
```
Expected: JSON with ios suite showing 1 passed, 1 failed.

**Step 3: Commit**
```bash
git add dashboard/parse-results.js
git commit -m "feat: add test result parser for dashboard"
```

---

### Task 3: Create the dashboard static SPA

**Files:**
- Create: `dashboard/index.html`

**Step 1: Create the single-file dashboard**

This is a self-contained HTML file with inline CSS and JS. It:
- Fetches `data/history.json` relative to its own URL
- Renders the dashboard view (summary cards, trend chart, run history table)
- Renders run detail view when a run is clicked (hash routing: `#run/<id>`)
- Dark theme with Abridge brand orange (#f56e3d)

The full file is large (~600 lines) but has zero dependencies. Key sections:
- CSS: Dark theme, responsive grid, animations
- SVG trend chart: Plots pass rate % per suite over history
- Run table: Clickable rows with suite status pills
- Detail view: Collapsible suite sections with test lists, error messages, screenshot thumbnails

**Step 2: Test locally with mock data**

```bash
mkdir -p dashboard/data
echo '[{"id":"1","sha":"abc1234","message":"test commit","branch":"main","timestamp":"2026-03-09T10:00:00Z","suites":{"web":{"status":"pass","passed":110,"failed":0,"total":110,"duration":245,"tests":[{"name":"Login","status":"pass","duration":3.2}]},"android":{"status":"pass","passed":20,"failed":0,"total":20,"duration":600,"tests":[{"name":"Login Flow","status":"pass","duration":54}]},"ios":{"status":"fail","passed":19,"failed":1,"total":20,"duration":550,"tests":[{"name":"Login Flow","status":"pass","duration":54},{"name":"Staff Posts","status":"fail","duration":15,"error":"App crashed"}]}}}]' > dashboard/data/history.json
cd dashboard && python3 -m http.server 8080
```
Open `http://localhost:8080` and verify dashboard renders.

**Step 3: Commit**
```bash
git add dashboard/index.html
git commit -m "feat: add e2e dashboard static SPA"
```

---

### Task 4: Add deploy-dashboard CI job

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Enable GitHub Pages in repo settings**

This must be done manually via GitHub UI or API:
```bash
gh api repos/hitenpatel/abridge/pages -X POST -f source='{"branch":"gh-pages","path":"/"}' 2>/dev/null || true
```
Or via UI: Settings > Pages > Source: "GitHub Actions"

**Step 2: Add permissions and pages config to workflow**

At the top of `ci.yml`, add:
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

**Step 3: Add the deploy-dashboard job**

After the 3 e2e jobs, add:

```yaml
  deploy-dashboard:
    runs-on: ubuntu-latest
    needs: [e2e-web, e2e-mobile-android, e2e-mobile-ios]
    if: always() && github.ref == 'refs/heads/main'
    permissions:
      pages: write
      id-token: write
      contents: read
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Download all test artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts/

      - name: Fetch existing history
        run: |
          mkdir -p dashboard/data
          curl -sSf "https://hitenpatel.github.io/abridge/data/history.json" \
            -o dashboard/data/history.json 2>/dev/null || echo "[]" > dashboard/data/history.json

      - name: Parse results and update history
        env:
          RUN_ID: ${{ github.run_id }}
          SHA: ${{ github.sha }}
          BRANCH: ${{ github.ref_name }}
          MESSAGE: ${{ github.event.head_commit.message }}
        run: |
          # Parse current run
          node dashboard/parse-results.js \
            --run-id "$RUN_ID" \
            --sha "$SHA" \
            --branch "$BRANCH" \
            --message "${MESSAGE%%$'\n'*}" \
            --timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --playwright "artifacts/playwright-report/playwright-report.json" \
            --maestro-android "artifacts/maestro-report-android/maestro-report.xml" \
            --maestro-android-screenshots "artifacts/maestro-report-android/maestro-debug" \
            --maestro-ios "artifacts/maestro-report-ios/maestro-report.xml" \
            --maestro-ios-screenshots "artifacts/maestro-report-ios/maestro-debug" \
            > /tmp/current-run.json

          # Prepend to history, keep last 50
          node -e "
            const fs = require('fs');
            const current = JSON.parse(fs.readFileSync('/tmp/current-run.json', 'utf8'));
            let history = [];
            try { history = JSON.parse(fs.readFileSync('dashboard/data/history.json', 'utf8')); } catch(e) {}
            history.unshift(current);
            history = history.slice(0, 50);
            fs.writeFileSync('dashboard/data/history.json', JSON.stringify(history, null, 2));
          "

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dashboard/

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 4: Commit**
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add deploy-dashboard job to publish e2e results to GitHub Pages"
```

---

### Task 5: Enable GitHub Pages and push

**Step 1: Enable GitHub Pages via API**

```bash
gh api repos/hitenpatel/abridge/pages -X POST --input - <<'EOF'
{"build_type":"workflow"}
EOF
```

If that fails (pages already partially configured), try:
```bash
gh api repos/hitenpatel/abridge/pages -X PUT --input - <<'EOF'
{"build_type":"workflow"}
EOF
```

**Step 2: Push all changes**
```bash
git push origin main
git push github main
```

**Step 3: Verify deployment**

After CI completes, verify:
- Dashboard job ran successfully
- `https://hitenpatel.github.io/abridge/` loads
- Shows the current run with all 3 suites

**Step 4: Commit any fixes if needed**
