import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedMealMenu,
} from "./helpers/seed-data";

/**
 * Parent Meal Booking E2E Journey
 * Tests: viewing weekly menu, booking a meal, empty state without menu,
 * disabled state when feature is off.
 */
test.describe("Parent Meal Booking", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-meals-${uniqueURN}@e2e-test.com`;
	});

	test("parent should view weekly menu and see meal options", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Meals School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-meals-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Meals Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { mealBookingEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Taylor",
		});

		await seedMealMenu({ schoolId: school.id, createdBy: user.id });

		// === STEP 4: Navigate to meals ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Meals/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Meals/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/meals/);

		// === STEP 5: Verify menu options visible ===
		await expect(page.getByText("Fish Fingers")).toBeVisible({ timeout: 10000 });
	});

	test("parent should book a meal for their child", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Book Meals ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-book-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Booking Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { mealBookingEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ethan",
			lastName: "Clark",
		});

		await seedMealMenu({ schoolId: school.id, createdBy: user.id });

		// === STEP 4: Navigate to meals ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Meals/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Meals/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/meals/);

		// === STEP 5: Wait for menu to load ===
		await expect(page.getByText("Fish Fingers")).toBeVisible({ timeout: 10000 });

		// === STEP 6: Click a Book button next to a meal option ===
		await page.getByRole("button", { name: "Book", exact: true }).first().click({ force: true });

		// === STEP 7: Verify booking confirmed — "Booked" badge appears ===
		await expect(page.getByText("Booked").first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("meal booking page shows empty state when no menu published", async ({ page }) => {
		const adminEmail = `admin-nomenu-${uniqueURN}@test.com`;

		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Menu ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Menu Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed child and enable feature but NO menu ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { mealBookingEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Lily",
			lastName: "Evans",
		});

		// === STEP 4: Navigate to meals ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Meals/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Meals/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/meals/);

		// === STEP 5: Verify empty state ===
		await expect(page.getByText(/no menu|no meals/i)).toBeVisible({ timeout: 10000 });
	});

	test("meals page shows disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup school WITHOUT enabling mealBookingEnabled ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Meals Feature ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nofeat-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Feature Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed child but DON'T enable meal booking ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 4: Navigate directly to meals ===
		await page.goto("http://localhost:3000/dashboard/meals");

		// === STEP 5: Should show disabled message ===
		await expect(page.getByText(/disabled|not available|not enabled/i).first()).toBeVisible({
			timeout: 10000,
		});
	});
});
