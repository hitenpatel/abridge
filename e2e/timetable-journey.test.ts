import { expect, test } from "@playwright/test";
import { getSchoolByURN, getUserByEmail, seedChildForParent } from "./helpers/seed-data";

/**
 * Timetable E2E Journey
 * Tests: parent view with heading, empty state when no timetable data exists,
 * and staff view loading the timetable page.
 *
 * Note: timetable is not behind a feature toggle; it is accessible to all
 * authenticated users. No enableSchoolFeature call is needed.
 */
test.describe("Timetable", () => {
	let uniqueURN: string;
	let staffEmail: string;
	let parentEmail: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		staffEmail = `teacher-timetable-${uniqueURN}@e2e-test.com`;
		parentEmail = `parent-timetable-${uniqueURN}@e2e-test.com`;
	});

	test("parent can view the timetable page heading", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Timetable Parent School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-tt-parent-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Timetable Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed a child so parent view can derive schoolId ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Mia",
			lastName: "Evans",
		});

		// === STEP 4: Navigate to timetable ===
		await page.goto("http://localhost:3000/dashboard/timetable");

		// === STEP 5: Verify the Timetable heading is visible ===
		await expect(page.getByRole("heading", { name: /Timetable/i }).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("parent sees empty state when no timetable data has been published", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Timetable Empty School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-tt-empty-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Empty Timetable Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed a child so parent view renders (no timetable entries seeded) ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Noah",
			lastName: "Thompson",
		});

		// === STEP 4: Navigate to timetable ===
		await page.goto("http://localhost:3000/dashboard/timetable");

		// === STEP 5: Verify the empty state message appears ===
		// The TimetableGrid component renders this text when allPeriods.length === 0
		await expect(page.getByText(/No timetable data found/i)).toBeVisible({ timeout: 10000 });
	});

	test("staff can view the timetable page", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Timetable Staff School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(staffEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as staff via setup registration link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Timetable Teacher");
		await page.getByLabel("Email Address").fill(staffEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Navigate to timetable ===
		await page.goto("http://localhost:3000/dashboard/timetable");

		// === STEP 4: Verify the Timetable heading is visible for staff ===
		await expect(page.getByRole("heading", { name: /Timetable/i }).first()).toBeVisible({
			timeout: 10000,
		});

		// === STEP 5: Verify the staff-specific MIS import link is rendered ===
		// StaffView only renders after the session loads with staffRole — use toPass to wait
		await expect(async () => {
			await expect(page.getByText(/MIS Integration/i).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 20000 });
	});
});
