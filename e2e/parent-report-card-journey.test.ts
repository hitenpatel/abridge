import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedReportCard,
	seedReportCycle,
} from "./helpers/seed-data";

/**
 * Parent Report Card E2E Journey
 * Tests: viewing published report cards with grades, report card details,
 * empty state with no reports, feature disabled state.
 */
test.describe("Parent Report Card", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-report-${uniqueURN}@e2e-test.com`;
	});

	test("parent should view a published report card with grades", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Report School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-rpt-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Report Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Taylor",
		});

		const cycle = await seedReportCycle({
			schoolId: school.id,
			createdBy: user.id,
			status: "PUBLISHED",
		});

		await seedReportCard({
			cycleId: cycle.id,
			childId: child.id,
			schoolId: school.id,
			teacherId: user.id,
		});

		// === STEP 4: Navigate to reports ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Reports/i }).first().click();

		// === STEP 5: Click on report cycle to view child's report ===
		await expect(page.getByText(/Autumn Term/i)).toBeVisible({ timeout: 10000 });
		await page.getByText(/Autumn Term/i).first().click();

		// === STEP 6: Verify child name and subject grades visible ===
		await expect(page.getByText(/Sophie/i)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Mathematics")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("English")).toBeVisible({ timeout: 10000 });
	});

	test("parent should see report card details", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Detail School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-dtl-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Detail Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data with custom general comment ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Oliver",
			lastName: "Smith",
		});

		const cycle = await seedReportCycle({
			schoolId: school.id,
			createdBy: user.id,
			status: "PUBLISHED",
		});

		await seedReportCard({
			cycleId: cycle.id,
			childId: child.id,
			schoolId: school.id,
			teacherId: user.id,
			generalComment: "Outstanding term for the child",
		});

		// === STEP 4: Navigate to reports ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Reports/i }).first().click();

		// === STEP 5: Click on report cycle ===
		await expect(page.getByText(/Autumn Term/i)).toBeVisible({ timeout: 10000 });
		await page.getByText(/Autumn Term/i).first().click();

		// === STEP 6: Verify general comment appears ===
		await expect(page.getByText("Outstanding term for the child")).toBeVisible({ timeout: 10000 });
	});

	test("report page shows empty state with no reports", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Empty Report ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-emp-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Empty Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed child and enable feature but NO cycles/cards ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emma",
			lastName: "Brown",
		});

		// === STEP 4: Navigate to reports ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Reports/i }).first().click();

		// === STEP 5: Verify empty state message ===
		await expect(page.getByText(/no report/i)).toBeVisible({ timeout: 10000 });
	});

	test("reports page shows disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup school WITHOUT enabling reportCardsEnabled ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Report ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-norpt-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Report Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed child but DON'T enable reportCardsEnabled
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 3: Navigate directly to reports ===
		await page.goto("http://localhost:3000/dashboard/reports");

		// === STEP 4: Should show disabled message ===
		await expect(page.getByText(/disabled|not available|not enabled/i).first()).toBeVisible({
			timeout: 10000,
		});
	});
});
