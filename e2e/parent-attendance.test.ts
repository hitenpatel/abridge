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

		// Step 3: Navigate to attendance page
		await page.reload(); // Reload to fetch new data
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Step 4: Verify attendance page shows child's name
		await expect(page.getByText(/Emma Smith/i)).toBeVisible({ timeout: 10000 });

		// Verify attendance heading is visible (not "No children found")
		await expect(page.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();

		// Attendance records should be visible (at least presence marks or dates)
		// The AttendanceList component should display the records
		await expect(async () => {
			// Should show some attendance data (marks like "Present" or dates)
			const hasAttendanceData =
				(await page.getByText(/present/i).count()) > 0 ||
				(await page.locator('[role="table"], [data-testid="attendance-record"]').count()) > 0;

			expect(hasAttendanceData).toBe(true);
		}).toPass({ timeout: 5000 });
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
		await page.reload();
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Wait for page to load with child data
		await expect(page.getByText(/Oliver Johnson/i)).toBeVisible({ timeout: 10000 });

		// Click "Report Absence" button
		await page.getByRole("button", { name: /Report Absence/i }).click();

		// Step 4: Fill out absence form
		// The form should appear (AbsenceReportForm component)
		await expect(
			page
				.getByText(/report.*absence|absence.*report/i)
				.or(page.getByRole("heading", { name: /absence/i }))
				.first(),
		).toBeVisible({ timeout: 5000 });

		// Select date range (today and tomorrow)
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Fill reason
		await page.getByLabel(/reason|why/i).fill("Medical appointment and follow-up");

		// Note: Date pickers vary by implementation - try common patterns
		const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
		const endDateInput = page.locator('input[name="endDate"], input[type="date"]').nth(1);

		if (await startDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
			await startDateInput.fill(today.toISOString().split("T")[0]);
			await endDateInput.fill(tomorrow.toISOString().split("T")[0]);
		}

		// Submit form
		await page.getByRole("button", { name: /submit|report/i }).click();

		// Step 5: Verify success
		await expect(
			page
				.getByText(/success|submitted|reported/i)
				.or(page.getByRole("button", { name: /Report Absence/i })),
		).toBeVisible({ timeout: 10000 });

		// Form should close (Report Absence button reappears)
		await expect(page.getByRole("button", { name: /Report Absence/i })).toBeVisible({
			timeout: 5000,
		});
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
		await page.reload();
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);

		// Step 4: Verify both children are shown (tabs or dropdown)
		await expect(page.getByText(/Sophia Williams/i)).toBeVisible({ timeout: 10000 });

		// Check if there's a tab or button for second child
		const liamTab = page
			.getByRole("button", { name: /Liam/i })
			.or(page.getByText(/Liam Williams/i))
			.first();
		await expect(liamTab).toBeVisible({ timeout: 5000 });

		// Click to switch to second child (if tabs exist)
		if (
			await page
				.getByRole("button", { name: /Liam/i })
				.isVisible({ timeout: 2000 })
				.catch(() => false)
		) {
			await page.getByRole("button", { name: /Liam/i }).click();

			// Should now show Liam's attendance
			await expect(page.getByText(/Liam Williams/i)).toBeVisible();
		}
	});
});
