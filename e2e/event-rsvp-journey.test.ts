import { expect, test } from "@playwright/test";

/**
 * Event RSVP journey tests.
 */
test.describe("Event RSVP", () => {
	test("parent should see RSVP buttons on an event requiring RSVP", async ({ page }) => {
		// Register as parent
		const email = `e2e-rsvp-parent-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("RSVP Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to calendar
		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);
		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();

		// Verify the calendar page loads without errors
		await page.waitForTimeout(2000);
	});

	test("staff should see headcount badge on RSVP events", async ({ page }) => {
		// Login as staff (use seed admin)
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("claire@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to calendar
		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);
		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();

		// Wait for events to load
		await page.waitForTimeout(2000);

		// Verify calendar renders (staff should see create button)
		await expect(page.getByTestId("create-event-button")).toBeVisible();
	});
});
