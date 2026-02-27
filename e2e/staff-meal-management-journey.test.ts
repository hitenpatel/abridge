import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedMealMenu,
} from "./helpers/seed-data";

/**
 * Staff Meal Management E2E Journey
 * Tests: staff meal management view, seeded menu options,
 * kitchen dashboard area.
 */
test.describe("Staff Meal Management", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `staff-meal-${uniqueURN}@e2e-test.com`;
	});

	test("staff should see meal management view", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Meal School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Meal Staff User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("MealPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable meal booking feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { mealBookingEnabled: true } });

		// === STEP 4: Wait for staff nav to sync and navigate to meals ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Meals/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page.getByRole("link", { name: /Meals/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/meals/);

		// === STEP 5: Verify staff meal management view ===
		await expect(page.getByText("Create Menu")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Manage school meal menus")).toBeVisible({ timeout: 10000 });
	});

	test("staff should see seeded menu options", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Menu School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Menu Staff User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("MenuPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature and seed menu ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { mealBookingEnabled: true } });
		await seedMealMenu({ schoolId: school.id, createdBy: user.id });

		// === STEP 4: Wait for staff nav to sync and navigate to meals ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Meals/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page.getByRole("link", { name: /Meals/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/meals/);

		// === STEP 5: Verify seeded menu options are visible ===
		await expect(page.getByText("Manage Menus")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/options/i)).toBeVisible({ timeout: 10000 });
	});

	test("staff should view kitchen dashboard area", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Kitchen School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Kitchen Staff User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("KitchenPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature and seed menu ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { mealBookingEnabled: true } });
		await seedMealMenu({ schoolId: school.id, createdBy: user.id });

		// === STEP 4: Wait for staff nav to sync and navigate to meals ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Meals/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page.getByRole("link", { name: /Meals/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/meals/);

		// === STEP 5: Verify kitchen dashboard section is visible ===
		await expect(page.getByText("Kitchen Dashboard")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("No bookings for this date.")).toBeVisible({ timeout: 10000 });
	});
});
