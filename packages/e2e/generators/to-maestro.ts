import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { loadAllJourneys } from "../journeys/loader.js";
import type { Journey, Step, Assertion } from "../journeys/types.js";
import { TAB_MAP } from "./tab-map.js";
import { TEST_CREDENTIALS, TEST_URLS } from "../fixtures/constants.js";

const GENERATED_DIR = new URL("../generated/maestro/", import.meta.url)
	.pathname;

function translateAction(step: Step): Record<string, any>[] {
	const selector = step.selectors.mobile;

	switch (step.action) {
		case "navigate": {
			const tab = TAB_MAP[step.target] || selector;
			return [{ tapOn: tab }];
		}
		case "tap":
			return [{ tapOn: selector }];
		case "fill":
			return [{ tapOn: selector }, { inputText: step.value || "" }];
		case "scroll":
			return [{ scrollUntilVisible: { element: selector } }];
		case "wait":
			return [{ waitForAnimationToEnd: {} }];
		case "long-press":
			return [{ longPressOn: selector }];
		default:
			throw new Error(`Unknown action: ${step.action}`);
	}
}

function translateAssertion(assertion: Assertion): Record<string, any> {
	switch (assertion.type) {
		case "visible":
			return { assertVisible: assertion.text };
		case "not-visible":
			return { assertNotVisible: assertion.text };
		default:
			throw new Error(
				`Unsupported assertion type for Maestro: ${assertion.type}`,
			);
	}
}

function generateFlow(journey: Journey): string {
	const commands: Record<string, any>[] = [
		{ appId: "com.schoolconnect.mobile" },
		{ launchApp: {} },
	];

	// Seed fixture via curl
	commands.push({
		runScript: `curl -X POST ${TEST_URLS.api}/api/test/seed -H "Content-Type: application/json" -d '{"fixture":"${journey.preconditions.seed}"}'`,
	});

	// Login if authenticated
	if (journey.preconditions.state === "authenticated") {
		commands.push(
			{ tapOn: "Email" },
			{ inputText: TEST_CREDENTIALS[journey.role].email },
			{ tapOn: "Password" },
			{ inputText: TEST_CREDENTIALS[journey.role].password },
			{ tapOn: "Sign In" },
			{ waitForAnimationToEnd: {} },
		);
	}

	// Add journey steps
	for (const step of journey.steps) {
		commands.push(...translateAction(step));
	}

	// Add assertions
	for (const assertion of journey.assertions) {
		commands.push(translateAssertion(assertion));
	}

	return stringifyYaml(commands);
}

function main() {
	const args = process.argv.slice(2);
	const tagsArg = args.find((arg) => arg.startsWith("--tags="));
	const tags = tagsArg?.split("=")[1]?.split(",");

	const journeys = loadAllJourneys({ tags });

	// Clean and recreate generated directory
	mkdirSync(GENERATED_DIR, { recursive: true });

	for (const journey of journeys) {
		// Skip if platform is excluded
		if (journey.skipPlatforms?.includes("mobile")) {
			continue;
		}

		const flowCode = generateFlow(journey);
		const outputPath = join(GENERATED_DIR, `${journey.id}.yaml`);

		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, flowCode);

		console.log(`Generated: ${outputPath}`);
	}

	console.log(
		`\nGenerated ${journeys.filter((j) => !j.skipPlatforms?.includes("mobile")).length} Maestro flows`,
	);
}

main();
