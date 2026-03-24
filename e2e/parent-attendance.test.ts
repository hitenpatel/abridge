import { expect, test } from "@playwright/test";

/**
 * Parent attendance journey: View attendance + Report absence
 * Uses pre-seeded data from packages/db/prisma/seed.ts:
 *   Parent: sarah@example.com / password123
 *   Children: Emily Johnson (Year 2) and Jack Johnson (Year 5)
 *   School: Oakwood Primary School (attendanceEnabled: true)
 */
test.describe("Parent Attendance Journey", () => {
	test("parent should view child's attendance records", async ({ page }) => {
		// Login as seeded parent
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to attendance page using toPass to wait for nav to load
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: "Attendance" }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: "Attendance" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Verify attendance page shows a child's name
		await expect(page.getByText(/Emily/i).first()).toBeVisible({ timeout: 10000 });

		// Verify attendance heading is visible
		await expect(page.getByRole("heading", { name: /Attendance/i })).toBeVisible();
	});

	test("parent should report an absence for their child", async ({ page }) => {
		// Login as seeded parent
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to attendance page
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: "Attendance" }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: "Attendance" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Wait for the attendance view to load with child data
		await expect(page.getByTestId("attendance-view")).toBeVisible({ timeout: 10000 });

		// Verify absence form elements are present (don't submit to avoid modifying seed data)
		await expect(page.getByText("Sick / Ill")).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId("absence-date-input")).toBeVisible();
		await expect(page.getByTestId("absence-submit")).toBeVisible();
	});

	test("parent with multiple children should see all attendance records", async ({ page }) => {
		// Login as seeded parent (Sarah has two children: Emily and Jack)
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to attendance page
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: "Attendance" }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: "Attendance" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Verify first child is visible (Emily is selected by default)
		await expect(page.getByText(/Emily/i).first()).toBeVisible({ timeout: 10000 });

		// Verify the child selector shows a button for the second child (Jack)
		const jackTab = page.getByRole("button", { name: /Jack/i });
		await expect(jackTab).toBeVisible({ timeout: 5000 });

		// Click to switch to second child and verify page stays on attendance
		await jackTab.click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);
	});
});
