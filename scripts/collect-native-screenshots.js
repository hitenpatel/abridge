#!/usr/bin/env node
/**
 * Collects native mobile screenshots from Maestro debug output.
 *
 * Maestro's `takeScreenshot: native-xxx` command saves PNGs to the debug-output
 * directory. This script finds them, copies them to the screenshots directory,
 * and merges them into screenshots-data.json.
 *
 * Usage:
 *   node scripts/collect-native-screenshots.js \
 *     --android-debug <maestro-debug-dir> \
 *     --ios-debug <maestro-debug-dir> \
 *     --screenshots-dir <output-dir> \
 *     --data-file <screenshots-data.json>
 */

const fs = require("node:fs");
const path = require("node:path");

const LABELS = {
	"native-parent-home": "Home",
	"native-parent-messages": "Messages",
	"native-parent-attendance": "Attendance",
	"native-parent-payments": "Payments",
	"native-parent-calendar": "Calendar",
	"native-parent-forms": "Forms",
	"native-parent-wellbeing": "Wellbeing",
	"native-parent-achievements": "Achievements",
	"native-parent-gallery": "Gallery",
	"native-parent-progress": "Progress",
	"native-parent-chat": "Chat",
	"native-parent-homework": "Homework",
	"native-parent-reading-diary": "Reading Diary",
	"native-parent-timetable": "Timetable",
	"native-parent-settings": "Settings",
	"native-parent-payment-history": "Payment History",
	"native-parent-student-profile": "Student Profile",
	"native-staff-home": "Staff Home",
	"native-staff-payments": "Staff Payments",
	"native-staff-attendance": "Staff Attendance",
	"native-staff-visitors": "Visitors",
	"native-staff-posts": "Staff Posts",
	"native-staff-compose-message": "Compose Message",
	"native-staff-compose-post": "Compose Post",
	"native-admin-staff-management": "Staff Management",
};

function parseArgs() {
	const args = {};
	const argv = process.argv.slice(2);
	for (let i = 0; i < argv.length; i++) {
		if (argv[i].startsWith("--")) {
			args[argv[i].slice(2)] = argv[i + 1] || "";
			i++;
		}
	}
	return args;
}

function findPngsRecursively(dir) {
	const results = [];
	try {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (fs.statSync(full).isDirectory()) {
				results.push(...findPngsRecursively(full));
			} else if (entry.endsWith(".png")) {
				results.push(full);
			}
		}
	} catch (_) {}
	return results;
}

function extractScreenshots(debugDir, platform, outputDir) {
	if (!debugDir || !fs.existsSync(debugDir)) {
		console.log(`No ${platform} debug dir found at: ${debugDir}`);
		return [];
	}

	const pngs = findPngsRecursively(debugDir);
	const found = [];

	for (const pngPath of pngs) {
		const filename = path.basename(pngPath, ".png");
		// Maestro takeScreenshot saves as the exact name provided
		if (!filename.startsWith("native-")) continue;

		const label = LABELS[filename];
		if (!label) {
			console.log(`  Skipping unknown screenshot: ${filename}`);
			continue;
		}

		const destName = `${platform}-${filename}.png`;
		const destPath = path.join(outputDir, destName);
		fs.copyFileSync(pngPath, destPath);
		console.log(`  Copied: ${filename} → ${destName}`);

		found.push({
			name: filename.replace("native-", ""),
			label,
			file: destName,
		});
	}

	console.log(`Found ${found.length} ${platform} screenshots`);
	return found;
}

const args = parseArgs();
const screenshotsDir = args["screenshots-dir"] || "dashboard/screenshots";
const dataFile = args["data-file"] || "dashboard/screenshots-data.json";

fs.mkdirSync(screenshotsDir, { recursive: true });

// Load existing data
let data = { generated: new Date().toISOString().split("T")[0], desktop: [], mobile: [] };
try {
	data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
} catch (_) {}

// Extract Android screenshots
const android = extractScreenshots(args["android-debug"], "android", screenshotsDir);
if (android.length > 0) {
	data.nativeAndroid = android;
}

// Extract iOS screenshots
const ios = extractScreenshots(args["ios-debug"], "ios", screenshotsDir);
if (ios.length > 0) {
	data.nativeIos = ios;
}

data.generated = new Date().toISOString().split("T")[0];
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`\nUpdated ${dataFile} with ${android.length} Android + ${ios.length} iOS screenshots`);
