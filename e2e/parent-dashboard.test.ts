import { expect, test } from "@playwright/test";

/**
 * Parent dashboard journey: Register → View dashboard → Navigate sections
 */
test.describe("Parent Dashboard Journey", () => {
	let parentEmail: string;
	let parentName: string;

	test.beforeEach(async ({ page }) => {
		parentEmail = `e2e-parent-dash-${Date.now()}@test.com`;
		parentName = "Dashboard Test Parent";

		// Register a fresh parent
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill(parentName);
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should display dashboard with user name and key sections", async ({ page }) => {
		// Verify welcome message
		await expect(page.getByText(parentName).first()).toBeVisible();
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

		// Verify Sign Out button
		await expect(page.getByRole("button", { name: /Sign Out/i })).toBeVisible();

		// Verify "My Children" section heading
		await expect(page.getByText("My Children")).toBeVisible();

		// New parent with no children should see empty state
		await expect(page.getByText(/No children linked/i)).toBeVisible();
	});

	test("should display search bar in header", async ({ page }) => {
		// Search bar should be in the header
		await expect(page.getByPlaceholder(/Search/i)).toBeVisible();
	});

	test("should navigate to attendance page", async ({ page }) => {
		await page.getByRole("link", { name: "Attendance" }).first().click();

		await expect(page).toHaveURL(/\/dashboard\/attendance/);
		// Page may show "Attendance" heading or "No children found" message
		await expect(
			page.getByText(/Attendance|No children found/i).first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("should navigate to calendar page", async ({ page }) => {
		await page.getByRole("link", { name: "Calendar" }).first().click();

		await expect(page).toHaveURL(/\/dashboard\/calendar/);
		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();
	});

	test("should navigate to messages page", async ({ page }) => {
		await page.getByRole("link", { name: "Messages" }).first().click();

		await expect(page).toHaveURL(/\/dashboard\/messages/);
		await expect(page.getByRole("heading", { name: /Sent Messages/i })).toBeVisible();
	});

	test("should navigate to forms page", async ({ page }) => {
		await page.getByRole("link", { name: "Forms" }).first().click();

		await expect(page).toHaveURL(/\/dashboard\/forms/);
		await expect(page.getByRole("heading", { name: /Forms & Consent/i })).toBeVisible();
	});

	test("should navigate to payments page", async ({ page }) => {
		await page.getByRole("link", { name: "Payments" }).first().click();

		await expect(page).toHaveURL(/\/dashboard\/payments/);
		await expect(
			page.getByRole("heading", { name: "Outstanding Payments", exact: true }),
		).toBeVisible();
	});
});
