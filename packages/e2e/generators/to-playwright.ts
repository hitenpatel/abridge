import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { loadAllJourneys } from "../journeys/loader.js";
import type { Journey, Step, Assertion } from "../journeys/types.js";
import { ROUTE_MAP } from "./route-map.js";
import { TEST_CREDENTIALS } from "../fixtures/constants.js";

const GENERATED_DIR = new URL("../generated/playwright/", import.meta.url)
	.pathname;

function translateAction(step: Step): string {
	const selector = step.selectors.web;

	switch (step.action) {
		case "navigate": {
			const route = ROUTE_MAP[step.target] || step.target;
			return `await page.goto('${route}');`;
		}
		case "tap": {
			const testId = selector.match(/data-testid='([^']+)'/)?.[1];
			if (testId) {
				return `await page.getByTestId('${testId}').click();`;
			}
			return `await page.locator('${selector}').click();`;
		}
		case "fill": {
			const testId = selector.match(/data-testid='([^']+)'/)?.[1];
			const value = step.value || "";
			if (testId) {
				return `await page.getByTestId('${testId}').fill('${value}');`;
			}
			return `await page.locator('${selector}').fill('${value}');`;
		}
		case "scroll": {
			const testId = selector.match(/data-testid='([^']+)'/)?.[1];
			if (testId) {
				return `await page.getByTestId('${testId}').scrollIntoViewIfNeeded();`;
			}
			return `await page.locator('${selector}').scrollIntoViewIfNeeded();`;
		}
		case "wait": {
			const testId = selector.match(/data-testid='([^']+)'/)?.[1];
			if (testId) {
				return `await page.getByTestId('${testId}').waitFor();`;
			}
			return `await page.locator('${selector}').waitFor();`;
		}
		case "long-press": {
			const testId = selector.match(/data-testid='([^']+)'/)?.[1];
			if (testId) {
				return `await page.getByTestId('${testId}').click({ delay: 1000 });`;
			}
			return `await page.locator('${selector}').click({ delay: 1000 });`;
		}
		default:
			throw new Error(`Unknown action: ${step.action}`);
	}
}

function translateAssertion(assertion: Assertion): string {
	switch (assertion.type) {
		case "visible":
			return `await expect(page.getByText('${assertion.text}')).toBeVisible();`;
		case "not-visible":
			return `await expect(page.getByText('${assertion.text}')).not.toBeVisible();`;
		case "count": {
			const count = assertion.count || 0;
			return `await expect(page.getByText('${assertion.text}')).toHaveCount(${count});`;
		}
		case "navigate-back":
			return `await expect(page).toHaveURL('${ROUTE_MAP[assertion.target || ""] || assertion.target}');`;
		default:
			throw new Error(`Unknown assertion type: ${assertion.type}`);
	}
}

function generateTest(journey: Journey): string {
	const preconditionCode =
		journey.preconditions.state === "authenticated"
			? `
  // Login as ${journey.role}
  await page.goto('/');
  await page.getByTestId('email-input').fill('${TEST_CREDENTIALS[journey.role].email}');
  await page.getByTestId('password-input').fill('${TEST_CREDENTIALS[journey.role].password}');
  await page.getByTestId('login-button').click();
  await page.waitForURL('/dashboard**');
`
			: "";

	const stepsCode = journey.steps.map(translateAction).join("\n  ");
	const assertionsCode = journey.assertions.map(translateAssertion).join("\n  ");

	return `import { test, expect } from '@playwright/test';

test.describe('${journey.name}', () => {
  test.beforeEach(async ({ request }) => {
    // Seed fixture
    await request.post('http://localhost:4000/api/test/seed', {
      data: { fixture: '${journey.preconditions.seed}' },
    });
  });

  test('${journey.name}', async ({ page }) => {
${preconditionCode}
    ${stepsCode}

    // Assertions
    ${assertionsCode}
  });
});
`;
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
		if (journey.skipPlatforms?.includes("web")) {
			continue;
		}

		const testCode = generateTest(journey);
		const outputPath = join(GENERATED_DIR, `${journey.id}.spec.ts`);

		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, testCode);

		console.log(`Generated: ${outputPath}`);
	}

	console.log(
		`\nGenerated ${journeys.filter((j) => !j.skipPlatforms?.includes("web")).length} Playwright tests`,
	);
}

main();
