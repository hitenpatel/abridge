import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedAchievement,
	seedAchievementCategory,
	seedChildForParent,
} from "./helpers/seed-data";

/**
 * Achievement journey tests.
 */
test.describe("Achievements", () => {
	let uniqueURN: string;
	let adminEmail: string;
	let parentEmail: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `admin-ach-${uniqueURN}@e2e-test.com`;
		parentEmail = `parent-ach-${uniqueURN}@e2e-test.com`;
	});

	test("staff should see awards page with category management", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Awards School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin via "Go to Registration" link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("Awards Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature and seed category ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { achievementsEnabled: true } });

		await seedAchievementCategory({
			schoolId: school.id,
			name: "Star of the Week",
			icon: "⭐",
			pointValue: 5,
		});

		// === STEP 4: Wait for Awards nav link to appear ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Awards/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		// === STEP 5: Navigate to achievements page ===
		await page.getByRole("link", { name: "Awards" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/achievements/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Awards/i })).toBeVisible();

		// Staff should see Award Achievement section
		await expect(page.getByRole("heading", { name: /Award Achievement/i })).toBeVisible();

		// Staff should see Class Leaderboard section
		await expect(page.getByRole("heading", { name: /Class Leaderboard/i })).toBeVisible();

		// Staff should see Categories section
		await expect(page.getByRole("heading", { name: /Categories/i })).toBeVisible();
	});

	test("staff should award an achievement to a student", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Award School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin via "Go to Registration" link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("Award Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { achievementsEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emma",
			lastName: "Taylor",
		});

		const category = await seedAchievementCategory({
			schoolId: school.id,
			name: "Brilliant Work",
			icon: "🌟",
			pointValue: 10,
		});

		// === STEP 4: Navigate to achievements ===
		await page.reload();
		await page
			.getByRole("link", { name: /Awards/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/achievements/);

		// === STEP 5: Fill the quick-award form ===
		await expect(page.getByRole("heading", { name: /Award Achievement/i })).toBeVisible({
			timeout: 10000,
		});

		await page.getByTestId("award-child-input").fill(child.id);
		await page.getByTestId("award-category-select").selectOption(category.id);
		await page.getByTestId("award-reason-input").fill("Outstanding effort in maths");

		// === STEP 6: Submit the award ===
		await page.getByTestId("award-submit").click();

		// === STEP 7: Verify success ===
		await expect(page.getByText("Achievement awarded!")).toBeVisible({ timeout: 10000 });

		// Leaderboard should now show the child
		await expect(page.getByTestId("leaderboard-entry")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Emma Taylor")).toBeVisible();
	});

	test("achievements page should show disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup school without enabling achievements ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Ach ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("No Ach Parent");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Navigate directly to achievements (feature NOT enabled) ===
		await page.goto("http://localhost:3000/dashboard/achievements");

		// === STEP 4: Should show disabled message ===
		await expect(page.getByRole("heading", { name: /Achievements is not enabled/i })).toBeVisible({
			timeout: 10000,
		});
	});

	test("parent should see achievements page with total points", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Parent Ach School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-pach-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent (via /register, NOT "Go to Registration") ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Achievements Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { achievementsEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Points",
		});

		const category = await seedAchievementCategory({
			schoolId: school.id,
			name: "Good Effort",
			icon: "🌟",
			pointValue: 10,
		});

		await seedAchievement({
			schoolId: school.id,
			childId: child.id,
			categoryId: category.id,
			awardedBy: user.id,
			reason: "Great work in class",
			points: 10,
		});

		// === STEP 4: Wait for Achievements nav link ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Achievements/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		// === STEP 5: Navigate to achievements page ===
		await page.getByRole("link", { name: "Achievements" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/achievements/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Achievements/i })).toBeVisible();

		// Should show total points
		await expect(page.getByText("Total Points")).toBeVisible();

		// Should show Badge Wall
		await expect(page.getByRole("heading", { name: /Badge Wall/i })).toBeVisible();

		// Should show Recent Awards
		await expect(page.getByRole("heading", { name: /Recent Awards/i })).toBeVisible();
	});
});
