import { expect, test } from "@playwright/test";

/**
 * Payments page tests.
 */
test.describe("Payments Page", () => {
	test.beforeEach(async ({ page }) => {
		const email = `e2e-payments-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Payments Test Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should display payments page with sections", async ({ page }) => {
		await page.getByRole("link", { name: "Payments" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		// Parent view
		await expect(
			page.getByRole("heading", { name: "Outstanding Payments", exact: true }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /View Payment History/i })).toBeVisible();

		// Staff view section (visible to all but functional for staff)
		await expect(page.getByRole("heading", { name: "Manage School Payments" })).toBeVisible();
	});

	test("should have link to payment history", async ({ page }) => {
		await page.getByRole("link", { name: "Payments" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		const historyLink = page.getByRole("link", { name: /View Payment History/i });
		await expect(historyLink).toBeVisible();

		await historyLink.click();
		await expect(page).toHaveURL(/\/dashboard\/payments\/history/);
	});

	test("should have link to create new payment item", async ({ page }) => {
		await page.getByRole("link", { name: "Payments" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		const newItemLink = page.getByRole("link", { name: /Create New Item/i });
		await expect(newItemLink).toBeVisible();
	});
});
