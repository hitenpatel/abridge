import { expect, test } from "@playwright/test";

/**
 * Forms & consent page tests.
 */
test.describe("Forms Page", () => {
	test.beforeEach(async ({ page }) => {
		const email = `e2e-forms-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Forms Test Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should display forms page with heading", async ({ page }) => {
		await page.getByRole("link", { name: "Forms" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		await expect(page.getByRole("heading", { name: /Forms & Consent/i })).toBeVisible();
		await expect(page.getByText(/Review and sign important documents/i)).toBeVisible();
	});

	test("should show empty state for parent with no children", async ({ page }) => {
		await page.getByRole("link", { name: "Forms" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		// Parent with no children should see empty forms message
		await expect(page.getByText(/No forms available/i)).toBeVisible({ timeout: 10000 });
	});
});
