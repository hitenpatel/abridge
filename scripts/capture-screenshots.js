/**
 * Captures screenshots of key app pages at desktop and mobile viewports.
 * Used in CI to generate marketing assets and visual regression snapshots.
 *
 * Usage: node scripts/capture-screenshots.js [output-dir]
 * Default output: screenshots/
 *
 * Requires: playwright, running API (port 4000) and web (port 3000) servers
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUTPUT_DIR = process.argv[2] || "screenshots";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const PARENT_EMAIL = "sarah@example.com";
const STAFF_EMAIL = "claire@oakwood.sch.uk";
const PASSWORD = "password123";

const VIEWPORTS = {
	desktop: { width: 1440, height: 900 },
	mobile: { width: 375, height: 812 },
};

const PARENT_SCREENS = [
	{ path: "/dashboard", name: "dashboard", label: "Parent Dashboard" },
	{ path: "/dashboard/homework", name: "homework", label: "Homework Tracker" },
	{ path: "/dashboard/reading", name: "reading", label: "Reading Diary" },
	{ path: "/dashboard/achievements", name: "achievements", label: "Achievement Wall" },
	{ path: "/dashboard/progress", name: "progress", label: "AI Progress Summary" },
	{ path: "/dashboard/calendar", name: "calendar", label: "School Calendar" },
	{ path: "/dashboard/attendance", name: "attendance", label: "Attendance" },
	{ path: "/dashboard/messages", name: "messages", label: "Messages" },
	{ path: "/dashboard/wellbeing", name: "wellbeing", label: "Wellbeing" },
	{ path: "/dashboard/meals", name: "meals", label: "Meal Booking" },
	{ path: "/dashboard/community", name: "community", label: "Community Hub" },
];

const STAFF_SCREENS = [
	{ path: "/dashboard", name: "staff-dashboard", label: "Staff Dashboard" },
	{ path: "/dashboard/settings", name: "settings", label: "Settings & Toggles" },
];

async function login(page, email) {
	await page.goto(`${BASE_URL}/login`);
	await page.waitForTimeout(2000);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: /Sign In/i }).click();
	await page.waitForURL(/dashboard/, { timeout: 30000 });
	await page.waitForTimeout(3000);
}

async function captureScreens(context, email, screens, viewportName) {
	const page = await context.newPage();
	page.setDefaultTimeout(60000);

	await login(page, email);

	for (const screen of screens) {
		try {
			await page.goto(`${BASE_URL}${screen.path}`, { timeout: 60000 });
			await page.waitForTimeout(4000);

			const filename = `${viewportName}-${screen.name}.png`;
			await page.screenshot({
				path: path.join(OUTPUT_DIR, filename),
				fullPage: false,
			});
			console.log(`  ✓ ${viewportName}/${screen.name}`);
		} catch (e) {
			console.log(`  ✗ ${viewportName}/${screen.name}: ${e.message.slice(0, 60)}`);
		}
	}

	await page.close();
}

async function main() {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	const browser = await chromium.launch();

	for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
		console.log(`\n📱 Capturing ${vpName} (${vpSize.width}x${vpSize.height}):`);
		const context = await browser.newContext({ viewport: vpSize });

		await captureScreens(context, PARENT_EMAIL, PARENT_SCREENS, vpName);
		await captureScreens(context, STAFF_EMAIL, STAFF_SCREENS, vpName);

		await context.close();
	}

	// Generate index.html for easy browsing
	const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".png")).sort();
	const desktopFiles = files.filter((f) => f.startsWith("desktop-"));
	const mobileFiles = files.filter((f) => f.startsWith("mobile-"));

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Abridge Screenshots</title>
  <style>
    body { font-family: system-ui; max-width: 1400px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
    h1 { color: #1E3A5F; }
    h2 { color: #1E3A5F; margin-top: 40px; border-bottom: 2px solid #FF7D45; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card img { width: 100%; display: block; }
    .card .label { padding: 12px 16px; font-weight: 600; color: #1E3A5F; }
    .mobile-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    .mobile-grid .card img { border: 8px solid #1E3A5F; border-radius: 20px; }
  </style>
</head>
<body>
  <h1>🎓 Abridge — App Screenshots</h1>
  <p>Auto-generated from CI pipeline. Last updated: ${new Date().toISOString().split("T")[0]}</p>

  <h2>Desktop (1440×900)</h2>
  <div class="grid">
    ${desktopFiles.map((f) => `<div class="card"><img src="${f}" alt="${f}"><div class="label">${f.replace("desktop-", "").replace(".png", "").replace(/-/g, " ")}</div></div>`).join("\n    ")}
  </div>

  <h2>Mobile (375×812)</h2>
  <div class="grid mobile-grid">
    ${mobileFiles.map((f) => `<div class="card"><img src="${f}" alt="${f}"><div class="label">${f.replace("mobile-", "").replace(".png", "").replace(/-/g, " ")}</div></div>`).join("\n    ")}
  </div>
</body>
</html>`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html);
	console.log(`\n📸 Screenshots saved to ${OUTPUT_DIR}/`);
	console.log(`📄 View gallery: ${OUTPUT_DIR}/index.html`);
	console.log(`   ${files.length} screenshots captured`);

	// Generate screenshots-data.json for the E2E dashboard gallery
	const allScreens = [...PARENT_SCREENS, ...STAFF_SCREENS];
	const screenshotsData = {
		generated: new Date().toISOString().split("T")[0],
		desktop: desktopFiles.map((f) => {
			const screenName = f.replace("desktop-", "").replace(".png", "");
			const screen = allScreens.find((s) => s.name === screenName);
			return { name: screenName, label: screen ? screen.label : screenName, file: f };
		}),
		mobile: mobileFiles.map((f) => {
			const screenName = f.replace("mobile-", "").replace(".png", "");
			const screen = allScreens.find((s) => s.name === screenName);
			return { name: screenName, label: screen ? screen.label : screenName, file: f };
		}),
	};
	fs.writeFileSync(
		path.join(OUTPUT_DIR, "screenshots-data.json"),
		JSON.stringify(screenshotsData, null, 2),
	);
	console.log(`📊 Generated screenshots-data.json`);

	// Copy screenshots to dashboard/screenshots/ for GitHub Pages deployment
	const dashboardScreenshotsDir = path.resolve(__dirname, "..", "dashboard", "screenshots");
	fs.mkdirSync(dashboardScreenshotsDir, { recursive: true });
	for (const f of files) {
		fs.copyFileSync(path.join(OUTPUT_DIR, f), path.join(dashboardScreenshotsDir, f));
	}
	fs.copyFileSync(
		path.join(OUTPUT_DIR, "screenshots-data.json"),
		path.resolve(__dirname, "..", "dashboard", "screenshots-data.json"),
	);
	console.log(`📂 Copied screenshots to dashboard/screenshots/`);

	// Copy screenshots to apps/web/public/screenshots/ for the marketing site
	const webScreenshotsDir = path.resolve(__dirname, "..", "apps", "web", "public", "screenshots");
	fs.mkdirSync(webScreenshotsDir, { recursive: true });
	for (const f of files) {
		fs.copyFileSync(path.join(OUTPUT_DIR, f), path.join(webScreenshotsDir, f));
	}
	fs.copyFileSync(
		path.join(OUTPUT_DIR, "screenshots-data.json"),
		path.join(webScreenshotsDir, "screenshots-data.json"),
	);
	console.log(`📂 Copied screenshots to apps/web/public/screenshots/`);

	await browser.close();
}

main().catch((e) => {
	console.error("Screenshot capture failed:", e.message);
	process.exit(1);
});
