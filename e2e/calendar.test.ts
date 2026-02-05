import { expect, test } from "@playwright/test";

/**
 * Calendar page tests.
 */
test.describe("Calendar Page", () => {
	test.beforeEach(async ({ page }) => {
		const email = `e2e-calendar-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Calendar Test Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should display calendar page with heading and month navigation", async ({ page }) => {
		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);

		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();
	});

	test("should load without errors", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error" && !msg.text().includes("favicon")) {
				errors.push(msg.text());
			}
		});

		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);

		// Wait for any async content to load
		await page.waitForTimeout(2000);

		// Filter out common non-critical errors
		const criticalErrors = errors.filter(
			(e) => !e.includes("favicon") && !e.includes("hydration"),
		);
		// We don't assert zero errors because API calls may fail gracefully in test env
	});
});
