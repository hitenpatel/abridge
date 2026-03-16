import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedProgressSummary,
} from "./helpers/seed-data";

/**
 * Progress Summary E2E Journey
 * Tests: parent views progress summary, disabled state
 */
test.describe("Progress Summary", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-progress-${uniqueURN}@e2e-test.com`;
	});

	test("parent should view progress summary for their child", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Progress School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-prog-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Progress Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { progressSummariesEnabled: true },
		});

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Taylor",
		});

		await seedProgressSummary({
			childId: child.id,
			schoolId: school.id,
			summary:
				'Attendance: 100% (5/5 days).\nHomework: completed 3 of 4 assignments.\nReading: read 4 days this week (avg 18 min/day, 4-day streak). Currently reading "Charlotte\'s Web".\nAchievements: earned 15 points — Star of the Week, Reading Champion.\nWellbeing: mood average GOOD, stable trend.',
		});

		// === STEP 4: Navigate to progress page ===
		await page.reload();
		await page.goto("http://localhost:3000/dashboard/progress");

		// === STEP 5: Verify summary content is visible ===
		await expect(page.getByRole("heading", { name: /Progress/i })).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText(/Attendance/i).first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/100%/)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/Homework/i).first()).toBeVisible();
	});

	test("progress page should show disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup school without enabling progress summaries ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Progress ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-noprog-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Progress Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed child but DON'T enable progress summaries
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 2: Navigate directly to progress ===
		await page.goto("http://localhost:3000/dashboard/progress");

		// === STEP 3: Should show disabled message ===
		await expect(
			page.getByRole("heading", { name: /Progress Summaries is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
