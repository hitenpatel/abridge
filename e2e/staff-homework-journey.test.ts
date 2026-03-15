import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedHomeworkAssignment,
	seedHomeworkCompletion,
} from "./helpers/seed-data";

/**
 * Staff Homework Management E2E Journey
 * Tests: setting homework, viewing completions, cancelling assignments.
 */
test.describe("Staff Homework Management", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `staff-hw-${uniqueURN}@e2e-test.com`;
	});

	test("teacher should set homework for a year group", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Staff HW School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin/teacher ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("HW Teacher");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable homework feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { homeworkEnabled: true } });

		// === STEP 4: Navigate to homework ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Homework/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Homework/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/homework/);

		// === STEP 5: Fill in Set Homework form ===
		await expect(page.getByRole("heading", { name: "Set Homework" })).toBeVisible({
			timeout: 10000,
		});

		await page.getByLabel("Subject").fill("Mathematics");
		await page.getByLabel("Title").fill("Fractions Worksheet");
		await page.getByLabel("Year Group").fill("Year 4");

		// Set due date to 7 days from now
		const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		const dueDateStr = dueDate.toISOString().split("T")[0];
		await page.getByLabel("Due Date").fill(dueDateStr);

		// === STEP 6: Submit ===
		await page.getByRole("button", { name: /Set Homework/i }).click();

		// === STEP 7: Verify appears in assignments list ===
		await expect(page.getByText("Fractions Worksheet")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("My Assignments")).toBeVisible({ timeout: 10000 });
	});

	test("teacher should see completion status", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Completion HW School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin/teacher ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Completion Teacher");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { homeworkEnabled: true } });

		// Seed children and completions
		const child1 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Liam",
			lastName: "Harris",
		});
		const child2 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ava",
			lastName: "Harris",
		});

		const assignment = await seedHomeworkAssignment({
			schoolId: school.id,
			setBy: user.id,
			subject: "English",
			title: "Spelling Test Prep",
			yearGroup: "4",
		});

		await seedHomeworkCompletion({
			assignmentId: assignment.id,
			childId: child1.id,
			status: "COMPLETED",
		});
		await seedHomeworkCompletion({
			assignmentId: assignment.id,
			childId: child2.id,
			status: "NOT_STARTED",
		});

		// === STEP 4: Navigate to homework ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Homework/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Homework/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/homework/);

		// === STEP 5: Verify completion count ===
		await expect(page.getByText("Spelling Test Prep")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("2 completed")).toBeVisible({ timeout: 10000 });
	});

	test("teacher should cancel homework", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Cancel HW School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin/teacher ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Cancel Teacher");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { homeworkEnabled: true } });

		await seedHomeworkAssignment({
			schoolId: school.id,
			setBy: user.id,
			subject: "Art",
			title: "Watercolour Painting",
			yearGroup: "4",
		});

		// === STEP 4: Navigate to homework ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Homework/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Homework/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/homework/);

		// === STEP 5: Expand assignment ===
		await expect(page.getByText("Watercolour Painting").first()).toBeVisible({ timeout: 10000 });
		await page.getByText("Watercolour Painting").first().click();

		// === STEP 6: Click Cancel and confirm dialog ===
		page.on("dialog", (dialog) => dialog.accept());
		const cancelButton = page
			.locator("button", { hasText: /Cancel/ })
			.filter({ has: page.locator("svg") });
		await expect(cancelButton).toBeVisible({ timeout: 5000 });
		await cancelButton.click();

		// === STEP 7: Verify assignment disappears from list (ACTIVE filter removes it) ===
		await page.waitForTimeout(2000);
		await page.reload();
		await expect(page.getByText("Watercolour Painting")).toHaveCount(0, { timeout: 10000 });
	});
});
