import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Accessibility Checks", () => {
	test("landing page has no critical a11y violations", async ({ page }) => {
		await page.goto("http://localhost:3000/");
		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

		const critical = results.violations.filter(
			(v) => v.impact === "critical" || v.impact === "serious",
		);
		expect(critical).toEqual([]);
	});

	test("login page has no critical a11y violations", async ({ page }) => {
		await page.goto("http://localhost:3000/login");
		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

		const critical = results.violations.filter(
			(v) => v.impact === "critical" || v.impact === "serious",
		);
		expect(critical).toEqual([]);
	});

	test("register page has no critical a11y violations", async ({ page }) => {
		await page.goto("http://localhost:3000/register");
		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

		const critical = results.violations.filter(
			(v) => v.impact === "critical" || v.impact === "serious",
		);
		expect(critical).toEqual([]);
	});

	test("dashboard page has no critical a11y violations after login", async ({ page }) => {
		// Login as parent
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

		const critical = results.violations.filter(
			(v) => v.impact === "critical" || v.impact === "serious",
		);

		if (critical.length > 0) {
			console.log(
				"Dashboard a11y violations:",
				JSON.stringify(
					critical.map((v) => ({ id: v.id, impact: v.impact, description: v.description })),
					null,
					2,
				),
			);
		}

		expect(critical).toEqual([]);
	});
});
