import { expect, test } from "@playwright/test";

/**
 * Achievement journey tests.
 */
test.describe("Achievements", () => {
	test("staff should see awards page with category management", async ({ page }) => {
		// Login as staff (use seed admin)
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("claire@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to achievements page
		await page.getByRole("link", { name: "Awards" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/achievements/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Awards/i })).toBeVisible();

		// Staff should see Award Achievement section
		await expect(page.getByRole("heading", { name: /Award Achievement/i })).toBeVisible();

		// Staff should see Class Leaderboard section
		await expect(page.getByRole("heading", { name: /Class Leaderboard/i })).toBeVisible();

		// Staff should see Categories section
		await expect(page.getByRole("heading", { name: /Categories/i })).toBeVisible();
	});

	test("parent should see achievements page with total points", async ({ page }) => {
		// Login as parent
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to achievements page
		await page.getByRole("link", { name: "Achievements" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/achievements/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Achievements/i })).toBeVisible();

		// Should show total points
		await expect(page.getByText("Total Points")).toBeVisible();

		// Should show Badge Wall
		await expect(page.getByRole("heading", { name: /Badge Wall/i })).toBeVisible();

		// Should show Recent Awards
		await expect(page.getByRole("heading", { name: /Recent Awards/i })).toBeVisible();
	});
});
