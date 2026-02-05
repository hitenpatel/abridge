import { expect, test } from "@playwright/test";

/**
 * Messages page tests.
 */
test.describe("Messages Page", () => {
	test.beforeEach(async ({ page }) => {
		const email = `e2e-messages-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Messages Test Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should display messages page with heading", async ({ page }) => {
		await page.getByRole("link", { name: "Messages" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/messages/);

		await expect(page.getByRole("heading", { name: /Sent Messages/i })).toBeVisible();
	});

	test("should have compose new button", async ({ page }) => {
		await page.getByRole("link", { name: "Messages" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/messages/);

		await expect(page.getByRole("link", { name: /Compose New/i })).toBeVisible();
	});
});
