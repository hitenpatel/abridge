import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { TEST_CREDENTIALS, TEST_URLS } from "../fixtures/constants.js";
import { loadAllJourneys } from "../journeys/loader.js";
import type { Assertion, Journey, Step } from "../journeys/types.js";
import { TAB_MAP } from "./tab-map.js";

const GENERATED_DIR = new URL("../generated/maestro/", import.meta.url).pathname;

// When running in Expo Go mode (MAESTRO_EXPO_URL set), inputText is unavailable
// due to XCUITest driver incompatibility with Xcode 13. We use dev-mode test
// buttons for login and to prefill form fields.
const useTestButtons = !!process.env.MAESTRO_EXPO_URL;

function translateAction(step: Step): Record<string, unknown>[] {
	const selector = step.selectors.mobile;

	switch (step.action) {
		case "navigate": {
			const tab = TAB_MAP[step.target];
			// Skip navigation to login screen — launchApp already opens it
			if (!tab && (step.target === "login" || selector === "/")) {
				return [];
			}
			return [{ tapOn: tab || selector }];
		}
		case "tap":
			return [{ tapOn: selector }];
		case "fill":
			// In Expo Go mode, inputText crashes. Fill steps are replaced with
			// a single test button tap in generateFlow when mobileTestButton is set.
			if (useTestButtons) return [];
			return [{ tapOn: selector }, { inputText: step.value || "" }];
		case "scroll":
			return [{ scrollUntilVisible: { element: selector } }];
		case "wait":
			if (selector) {
				return [{ extendedWaitUntil: { visible: selector, timeout: 15000 } }];
			}
			return [{ waitForAnimationToEnd: {} }];
		case "long-press":
			return [{ longPressOn: selector }];
		default:
			throw new Error(`Unknown action: ${step.action}`);
	}
}

function translateAssertion(assertion: Assertion): Record<string, unknown> {
	const text = assertion.mobileText || assertion.text;
	switch (assertion.type) {
		case "visible":
			// Use extendedWaitUntil instead of assertVisible to handle async
			// operations like login API calls and data loading
			return {
				extendedWaitUntil: {
					visible: text,
					timeout: 15000,
				},
			};
		case "not-visible":
			return { assertNotVisible: text };
		default:
			throw new Error(`Unsupported assertion type for Maestro: ${assertion.type}`);
	}
}

function generateFlow(journey: Journey): string {
	// Use MAESTRO_APP_ID env var to switch between native build and Expo Go
	const appId = process.env.MAESTRO_APP_ID || "com.abridge.app";
	// When running via Expo Go, set MAESTRO_EXPO_URL to deep-link into the project
	// e.g. MAESTRO_EXPO_URL=exp://localhost:8081
	const expoUrl = process.env.MAESTRO_EXPO_URL;

	// Config section (before the --- separator)
	const config: Record<string, unknown> = { appId };

	// Commands section (after the --- separator)
	const commands: Record<string, unknown>[] = [];
	if (expoUrl) {
		// For Expo Go: invalidate server-side sessions BEFORE restarting the app.
		// This ensures the app's stored SecureStore token is rejected on launch,
		// forcing a redirect to the login screen. clearKeychain doesn't clear
		// expo-secure-store, and clearState breaks Expo Go's networking.
		commands.push(
			{
				evalScript: `\${http.post('${TEST_URLS.api}/api/test/clean', { headers: { 'Content-Type': 'application/json' }, body: '{}' })}`,
			},
			{ stopApp: {} },
			{
				launchApp: {
					arguments: { EXKernelLaunchUrlDefaultsKey: expoUrl },
				},
			},
		);
	} else {
		commands.push({ launchApp: { clearState: true } });
	}

	// When using Expo Go, dismiss system dialogs and wait for the JS bundle
	if (expoUrl) {
		commands.push(
			// Dismiss iOS "Open in Expo Go?" deep-link confirmation
			{ tapOn: { text: "Open", optional: true } },
			// Wait for JS bundle to download and app to render
			{ waitForAnimationToEnd: { timeout: 30000 } },
			// Dismiss Expo Go first-launch developer menu
			// Use coordinate tap — native UIKit text not visible to Maestro
			{ tapOn: { point: "50%,93%", optional: true } },
			{ waitForAnimationToEnd: {} },
		);
	}

	// Wait for login screen to be ready before seeding
	if (expoUrl) {
		commands.push({
			extendedWaitUntil: {
				visible: "Sign In",
				timeout: 15000,
			},
		});
	}

	// Seed fixture via Maestro's http.post
	commands.push({
		evalScript: `\${http.post('${TEST_URLS.api}/api/test/seed', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fixture: '${journey.preconditions.seed}' }) })}`,
	});

	// Login if authenticated — use dev-mode test buttons to avoid inputText
	// (Maestro's XCUITest driver crashes on inputText with Xcode 13/iOS 15)
	if (journey.preconditions.state === "authenticated") {
		const testButton = journey.role === "staff" ? "Test Staff" : "Test Parent";
		commands.push(
			{ tapOn: testButton },
			// Wait for the login API call to complete and the home screen to render.
			// The tab bar "Home" label (with accessibilityLabel) is the most reliable
			// indicator that the home screen has loaded.
			{
				extendedWaitUntil: {
					visible: "Home",
					timeout: 15000,
				},
			},
		);
	}

	const hasFill = journey.steps.some((s) => s.action === "fill");

	// For login journeys (unauthenticated with fill), replace fill+tap with
	// a single test login button
	if (useTestButtons && journey.preconditions.state === "unauthenticated" && hasFill) {
		const testButton = journey.role === "staff" ? "Test Staff" : "Test Parent";
		commands.push({ tapOn: testButton }, { waitForAnimationToEnd: {} });
	} else {
		// Track whether we've already injected the test button for fill actions
		let testButtonInjected = false;

		for (const step of journey.steps) {
			if (useTestButtons && step.action === "fill" && journey.mobileTestButton) {
				// In Expo Go mode, replace all fill steps with a single test button tap.
				// The button prefills all form fields at once.
				if (!testButtonInjected) {
					commands.push({ tapOn: journey.mobileTestButton }, { waitForAnimationToEnd: {} });
					testButtonInjected = true;
				}
				// Skip subsequent fill steps — the button fills everything
				continue;
			}
			commands.push(...translateAction(step));
		}
	}

	// Add assertions
	for (const assertion of journey.assertions) {
		commands.push(translateAssertion(assertion));
	}

	return `${stringifyYaml(config)}---\n${stringifyYaml(commands)}`;
}

function main() {
	const args = process.argv.slice(2);
	const tagsArg = args.find((arg) => arg.startsWith("--tags="));
	const tags = tagsArg?.split("=")[1]?.split(",");

	const journeys = loadAllJourneys({ tags });

	// Clean and recreate generated directory
	mkdirSync(GENERATED_DIR, { recursive: true });

	let generated = 0;
	let skipped = 0;
	for (const journey of journeys) {
		// Skip if platform is excluded
		if (journey.skipPlatforms?.includes("mobile")) {
			continue;
		}

		// In Expo Go mode, skip flows that need text input but have no
		// mobileTestButton to replace the fill steps
		if (useTestButtons && journey.preconditions.state !== "unauthenticated") {
			const hasFill = journey.steps.some((s) => s.action === "fill");
			if (hasFill && !journey.mobileTestButton) {
				console.log(`Skipped (needs text input, no mobileTestButton): ${journey.id}`);
				skipped++;
				continue;
			}
		}

		const flowCode = generateFlow(journey);
		const outputPath = join(GENERATED_DIR, `${journey.id}.yaml`);

		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, flowCode);

		console.log(`Generated: ${outputPath}`);
		generated++;
	}

	console.log(
		`\nGenerated ${generated} Maestro flows${skipped > 0 ? ` (${skipped} skipped)` : ""}`,
	);
}

main();
