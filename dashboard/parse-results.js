#!/usr/bin/env node
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

              let screenshot = null;
              if (result.attachments) {
                const ss = result.attachments.find(
                  (a) => a.name === "screenshot" && a.path
                );
                if (ss && ss.path && fs.existsSync(ss.path)) {
                  const buf = fs.readFileSync(ss.path);
                  if (buf.length <= 200000) {
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
  try {
    const dirs = fs.readdirSync(screenshotDir);
    for (const dir of dirs) {
      const fullDir = path.join(screenshotDir, dir);
      if (!fs.statSync(fullDir).isDirectory()) continue;
      const pngs = fs.readdirSync(fullDir).filter((f) => f.endsWith(".png"));
      if (pngs.length === 0) continue;
      const lastPng = pngs[pngs.length - 1];
      const buf = fs.readFileSync(path.join(fullDir, lastPng));
      if (buf.length > 200000) continue;
      const b64 = `data:image/png;base64,${buf.toString("base64")}`;
      const flowName = dir.replace(/-/g, " ").toLowerCase();
      for (const test of tests) {
        if (
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

const web = parsePlaywrightJson(args.playwright);
if (web) run.suites.web = web;

const android = parseJunitXml(args["maestro-android"]);
if (android) {
  loadMaestroScreenshots(args["maestro-android-screenshots"], android.tests);
  run.suites.android = android;
}

const ios = parseJunitXml(args["maestro-ios"]);
if (ios) {
  loadMaestroScreenshots(args["maestro-ios-screenshots"], ios.tests);
  run.suites.ios = ios;
}

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
