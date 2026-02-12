import { expect, test } from "@playwright/test";

/**
 * Attendance page tests for parent users.
 * Since a fresh parent has no linked children, we test both empty and page load states.
 */
test.describe("Attendance Page", () => {
	test.beforeEach(async ({ page }) => {
		// Register a fresh parent
		const email = `e2e-attendance-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Attendance Test Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should display attendance page", async ({ page }) => {
		await page.getByRole("link", { name: "Attendance" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// For a parent with no children, the page shows "No children found"
		// For a parent with children, it shows "Attendance" heading
		await expect(page.getByText(/Attendance|No children found/i).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("should show empty state when no children linked", async ({ page }) => {
		await page.getByRole("link", { name: "Attendance" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Parent with no children should see appropriate message
		await expect(page.getByText(/No children found/i)).toBeVisible({ timeout: 10000 });
	});
});
