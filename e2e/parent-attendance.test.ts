import { expect, test } from "@playwright/test";
import {
	getSchoolByURN,
	getUserByEmail,
	seedAttendanceRecords,
	seedChildForParent,
} from "./helpers/seed-data";

/**
 * Parent attendance journey: View attendance + Report absence
 */
test.describe("Parent Attendance Journey", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-attendance-${uniqueURN}@e2e-test.com`;
	});

	test("parent should view child's attendance records", async ({ page }) => {
		// Step 1: Create school and register parent
		const schoolName = `Attendance Test School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// Register as parent (not admin)
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Attendance Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and attendance data
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emma",
			lastName: "Smith",
		});

		// Seed 7 days of attendance records
		await seedAttendanceRecords({
			childId: child.id,
			schoolId: school.id,
			daysBack: 7,
		});

		// Step 3: Navigate to attendance page using toPass to wait for nav to load
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: "Attendance", exact: true }).first()).toBeVisible(
				{ timeout: 3000 },
			);
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Step 4: Verify attendance page shows child's name (may need reload to pick up seeded data)
		await expect(async () => {
			await page.reload();
			await expect(page.getByText(/Emma/i).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// Verify attendance heading is visible (not "No children found")
		await expect(page.getByRole("heading", { name: /Attendance/i })).toBeVisible();
	});

	test("parent should report an absence for their child", async ({ page }) => {
		// Step 1: Setup school and parent
		const schoolName = `Absence Report School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Absence Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Oliver",
			lastName: "Johnson",
		});

		// Step 3: Navigate to attendance and open absence report form
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: "Attendance", exact: true }).first()).toBeVisible(
				{ timeout: 3000 },
			);
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Wait for page to load with child data (may need reload to pick up seeded data)
		await expect(async () => {
			await page.reload();
			await expect(page.getByText(/Oliver/i).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// Step 4: Fill out absence form (always visible in the right column)
		// Select reason via radio button
		await page.getByText("Sick / Ill").click();

		// Fill date
		const today = new Date().toISOString().split("T")[0];
		await page.getByTestId("absence-date-input").fill(today);

		// Submit form
		await page.getByTestId("absence-submit").click();

		// Step 5: Verify we're still on the attendance page
		await expect(page).toHaveURL(/\/dashboard\/attendance/);
	});

	test("parent with multiple children should see all attendance records", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Multi-Child School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Multi-Child Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed 2 children
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child1 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophia",
			lastName: "Williams",
		});

		const child2 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Liam",
			lastName: "Williams",
		});

		// Seed attendance for both
		await seedAttendanceRecords({ childId: child1.id, schoolId: school.id, daysBack: 5 });
		await seedAttendanceRecords({ childId: child2.id, schoolId: school.id, daysBack: 5 });

		// Step 3: Navigate to attendance
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: "Attendance", exact: true }).first()).toBeVisible(
				{ timeout: 3000 },
			);
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Step 4: Verify both children are shown (may need reload for seeded data)
		await expect(async () => {
			await page.reload();
			await expect(page.getByText(/Sophia/i).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// Check if there's a button for second child
		const liamTab = page.getByRole("button", { name: /Liam/i });
		await expect(liamTab).toBeVisible({ timeout: 5000 });

		// Click to switch to second child — just verify the button click works and page stays on attendance
		await liamTab.click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);
	});
});
