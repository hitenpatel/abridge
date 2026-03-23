import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
} from "./helpers/seed-data";

/**
 * Clubs E2E Journey
 * Tests: feature disabled state, staff view, create button visibility,
 * parent view, and empty state when no clubs are seeded.
 */
test.describe("Clubs", () => {
	let uniqueURN: string;
	let staffEmail: string;
	let parentEmail: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		staffEmail = `teacher-clubs-${uniqueURN}@e2e-test.com`;
		parentEmail = `parent-clubs-${uniqueURN}@e2e-test.com`;
	});

	test("clubs page shows disabled state when clubBookingEnabled is false", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Clubs Disabled School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-clubs-dis-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as staff via setup registration link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Clubs Teacher");
		await page.getByLabel("Email Address").fill(staffEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Navigate directly to clubs — feature is off by default ===
		await page.goto("http://localhost:3000/dashboard/clubs");

		// === STEP 4: Should show feature disabled message ===
		await expect(page.getByText(/disabled|not available|not enabled/i).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("staff can view clubs list after feature is enabled", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Clubs Staff School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-clubs-staff-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as staff via setup registration link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Clubs Teacher");
		await page.getByLabel("Email Address").fill(staffEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable clubBookingEnabled feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { clubBookingEnabled: true } as any,
		});

		// === STEP 4: Navigate to clubs using toPass reload pattern ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Clubs/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Clubs/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/clubs/);

		// === STEP 5: Verify page heading is visible ===
		await expect(async () => {
			await expect(page.getByRole("heading", { name: /Clubs/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 15000 });
	});

	test("staff sees Create Club button when feature is enabled", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Clubs Create School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-clubs-create-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as staff via setup registration link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Clubs Teacher");
		await page.getByLabel("Email Address").fill(staffEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { clubBookingEnabled: true } as any,
		});

		// === STEP 4: Navigate to clubs ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Clubs/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Clubs/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/clubs/);

		// === STEP 5: Verify the Create Club button is visible for staff ===
		await expect(async () => {
			await expect(page.getByRole("button", { name: /Create Club/i })).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 15000 });
	});

	test("parent can view clubs page after feature is enabled", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Clubs Parent School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-clubs-parent-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Clubs Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed child and enable feature ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { clubBookingEnabled: true } as any,
		});

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Alice",
			lastName: "Johnson",
		});

		// === STEP 4: Navigate to clubs using toPass reload pattern ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Clubs/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Clubs/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/clubs/);

		// === STEP 5: Verify clubs page loads for parent ===
		await expect(page.getByRole("heading", { name: /Clubs/i }).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("parent sees empty state when no clubs have been created", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Clubs Empty School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-clubs-empty-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Empty Clubs Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature + seed child (no clubs seeded) ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { clubBookingEnabled: true } as any,
		});

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ben",
			lastName: "Williams",
		});

		// === STEP 4: Navigate to clubs ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Clubs/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Clubs/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/clubs/);

		// === STEP 5: Verify empty state message is visible ===
		await expect(page.getByText(/No clubs available/i)).toBeVisible({ timeout: 10000 });
	});
});
