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
 * Parent Homework Tracker E2E Journey
 * Tests: viewing assignments, marking complete, graded feedback, feature disabled state.
 */
test.describe("Parent Homework Tracker", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-hw-${uniqueURN}@e2e-test.com`;
	});

	test("parent should see homework for their child", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`HW School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-hw-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Homework Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { homeworkEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emma",
			lastName: "Clark",
		});

		const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
		await seedHomeworkAssignment({
			schoolId: school.id,
			setBy: user.id,
			subject: "English",
			title: "Book Report Chapter 3",
			yearGroup: "4",
			dueDate,
		});

		// Also seed a completion record linking the child to the assignment
		const assignment = await seedHomeworkAssignment({
			schoolId: school.id,
			setBy: user.id,
			subject: "Mathematics",
			title: "Times Tables Practice",
			yearGroup: "4",
			dueDate,
		});

		await seedHomeworkCompletion({
			assignmentId: assignment.id,
			childId: child.id,
			status: "NOT_STARTED",
		});

		// === STEP 4: Navigate to homework ===
		await page.reload();
		await page
			.getByRole("link", { name: /Homework/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/homework/);

		// === STEP 5: Verify homework page ===
		await expect(page.getByRole("heading", { name: /Homework/i }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator(".inline-flex").getByText("Mathematics")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Times Tables Practice")).toBeVisible({ timeout: 10000 });

		// Verify due date is shown
		const dueDateFormatted = dueDate.toLocaleDateString("en-GB", {
			weekday: "short",
			day: "numeric",
			month: "short",
		});
		await expect(page.getByText(dueDateFormatted)).toBeVisible({ timeout: 10000 });
	});

	test("parent should mark homework as complete", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`HW Done School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-hwdone-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Mark Done Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { homeworkEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Oliver",
			lastName: "Davies",
		});

		const assignment = await seedHomeworkAssignment({
			schoolId: school.id,
			setBy: user.id,
			subject: "Science",
			title: "Plant Growth Worksheet",
			yearGroup: "4",
		});

		await seedHomeworkCompletion({
			assignmentId: assignment.id,
			childId: child.id,
			status: "NOT_STARTED",
		});

		// === STEP 4: Navigate to homework ===
		await page.reload();
		await page
			.getByRole("link", { name: /Homework/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/homework/);

		// === STEP 5: Expand assignment ===
		await expect(page.getByText("Plant Growth Worksheet")).toBeVisible({ timeout: 10000 });
		await page.getByText("Plant Growth Worksheet").click();

		// === STEP 6: Click Mark as Done ===
		await expect(page.getByRole("button", { name: /Mark as Done/i })).toBeVisible({ timeout: 5000 });
		await page.getByRole("button", { name: /Mark as Done/i }).click();

		// === STEP 7: Verify completed status ===
		await expect(page.getByText("Completed")).toBeVisible({ timeout: 10000 });
	});

	test("parent should see graded homework with feedback", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`HW Grade School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-hwgrade-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Grade Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data with graded completion ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { homeworkEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophia",
			lastName: "Miller",
		});

		const assignment = await seedHomeworkAssignment({
			schoolId: school.id,
			setBy: user.id,
			subject: "History",
			title: "Roman Britain Essay",
			yearGroup: "4",
		});

		await seedHomeworkCompletion({
			assignmentId: assignment.id,
			childId: child.id,
			status: "COMPLETED",
			grade: "A",
			feedback: "Well done",
			gradedBy: user.id,
		});

		// === STEP 4: Navigate to homework ===
		await page.reload();
		await page
			.getByRole("link", { name: /Homework/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/homework/);

		// === STEP 5: Expand assignment ===
		await expect(page.getByText("Roman Britain Essay")).toBeVisible({ timeout: 10000 });
		await page.getByText("Roman Britain Essay").click();

		// === STEP 6: Verify grade and feedback ===
		await expect(page.getByText("Grade: A")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/"Well done"/)).toBeVisible({ timeout: 10000 });
	});

	test("homework page should show disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup without enabling homework ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No HW ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nohw-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No HW Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed child but DON'T enable homework
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 2: Navigate directly to homework ===
		await page.goto("http://localhost:3000/dashboard/homework");

		// === STEP 3: Should show disabled message ===
		await expect(
			page.getByRole("heading", { name: /Homework Tracker is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
