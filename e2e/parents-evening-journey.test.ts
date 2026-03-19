import { expect, test } from "@playwright/test";
import { enableSchoolFeature, getSchoolByURN } from "./helpers/seed-data";

/**
 * Parents' Evening journey tests.
 */
test.describe("Parents' Evening", () => {
	test("feature disabled — nav link is not shown when parentsEveningEnabled is false", async ({
		page,
	}) => {
		// === STEP 1: Setup school ===
		const uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		const adminEmail = `admin-pe-dis-${uniqueURN}@e2e-test.com`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`PE Disabled School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("PE Disabled Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Verify Parents' Evening nav link is NOT shown (feature off by default) ===
		await expect(page.getByRole("link", { name: /Parents' Evening/i }).first()).not.toBeVisible();

		// === STEP 4: Navigating directly to the page still renders it (no hard block) ===
		await page.goto("http://localhost:3000/dashboard/parents-evening");
		await expect(page.getByRole("heading", { name: /Parents' Evening/i })).toBeVisible({
			timeout: 10000,
		});
	});

	test("admin: can access parents evening page and sees create button when feature enabled", async ({
		page,
	}) => {
		// === STEP 1: Login as seeded admin ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("claire@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Enable parentsEveningEnabled for the seeded school ===
		const school = await getSchoolByURN("123456");
		if (!school) throw new Error("Seeded school 123456 not found");
		await enableSchoolFeature({ schoolId: school.id, features: { parentsEveningEnabled: true } });

		// === STEP 3: Wait for Parents' Evening nav link to appear ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Parents' Evening/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 15000 });

		// === STEP 4: Navigate to parents evening page ===
		await page.goto("http://localhost:3000/dashboard/parents-evening");
		await expect(page.getByRole("heading", { name: /Parents' Evening/i })).toBeVisible({
			timeout: 10000,
		});

		// === STEP 5: Admin should see the Create Evening button ===
		await expect(page.getByTestId("create-evening-button")).toBeVisible({ timeout: 10000 });
	});

	test("staff: can view parents evening page when feature is enabled", async ({ page }) => {
		// === STEP 1: Login as seeded teacher ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("marcus@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Ensure parentsEveningEnabled is on for the seeded school ===
		const school = await getSchoolByURN("123456");
		if (!school) throw new Error("Seeded school 123456 not found");
		await enableSchoolFeature({ schoolId: school.id, features: { parentsEveningEnabled: true } });

		// === STEP 3: Navigate to parents evening page ===
		await expect(async () => {
			await page.goto("http://localhost:3000/dashboard/parents-evening");
			await expect(page.getByRole("heading", { name: /Parents' Evening/i })).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 15000 });

		// === STEP 4: Staff should NOT see the Create Evening button (admin-only) ===
		await expect(page.getByTestId("create-evening-button")).not.toBeVisible();
	});

	test("parent: can view parents evening page when feature is enabled", async ({ page }) => {
		// === STEP 1: Login as seeded parent ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Ensure parentsEveningEnabled is on for the seeded school ===
		const school = await getSchoolByURN("123456");
		if (!school) throw new Error("Seeded school 123456 not found");
		await enableSchoolFeature({ schoolId: school.id, features: { parentsEveningEnabled: true } });

		// === STEP 3: Navigate to parents evening page ===
		await expect(async () => {
			await page.goto("http://localhost:3000/dashboard/parents-evening");
			await expect(page.getByRole("heading", { name: /Parents' Evening/i })).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 15000 });

		// === STEP 4: Parent should see the booking description ===
		await expect(page.getByText(/Book appointments with teachers/i)).toBeVisible({
			timeout: 10000,
		});
	});
});
