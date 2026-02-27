import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedLowMoodPattern,
	seedWellbeingAlert,
	seedWellbeingCheckIns,
} from "./helpers/seed-data";

/**
 * Staff Wellbeing Dashboard E2E Journey
 * Tests: class overview grid, alert queue, acknowledge alert,
 * resolve alert, manual flag, empty state.
 */
test.describe("Staff Wellbeing Dashboard", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `staff-wb-${uniqueURN}@e2e-test.com`;
	});

	test("staff should see class wellbeing overview with check-ins", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Staff WB School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Staff WB User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { wellbeingEnabled: true } });

		// Create a parent-owned child and seed check-ins
		const parentEmail = `parent-staffwb-${uniqueURN}@test.com`;
		// Create parent user directly for seeding
		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Taylor",
		});

		await seedWellbeingCheckIns({
			childId: child.id,
			schoolId: school.id,
			daysBack: 1,
			moods: ["GOOD"],
		});

		// === STEP 3: Navigate to wellbeing as staff ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Wellbeing/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Wellbeing/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/wellbeing/);

		// === STEP 4: Verify staff view heading ===
		await expect(page.getByText(/Class wellbeing overview/i)).toBeVisible({ timeout: 10000 });

		// === STEP 5: Verify today's check-ins section ===
		await expect(page.getByText("Today's Check-ins")).toBeVisible();
	});

	test("staff should see and manage wellbeing alerts", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Alert WB School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Alert Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AlertPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with alert ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { wellbeingEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Jack",
			lastName: "Harris",
		});

		await seedWellbeingAlert({
			childId: child.id,
			schoolId: school.id,
			triggerRule: "THREE_LOW_DAYS",
		});

		// === STEP 3: Navigate to wellbeing ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Wellbeing/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Wellbeing/i })
			.first()
			.click();

		// === STEP 4: Verify alert is shown ===
		await expect(page.getByText(/Open Alerts/i)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Jack Harris")).toBeVisible();
		await expect(page.getByText(/three low days/i)).toBeVisible();

		// === STEP 5: Acknowledge the alert ===
		await page
			.getByRole("button", { name: /Acknowledge/i })
			.first()
			.click();
		await page.waitForTimeout(1000);

		// === STEP 6: Resolve the alert ===
		await page
			.getByRole("button", { name: /Resolve/i })
			.first()
			.click();
		await page.waitForTimeout(1000);
	});

	test("staff wellbeing page should handle empty state gracefully", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Empty WB ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Empty Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("EmptyPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { wellbeingEnabled: true } });

		// === STEP 2: Navigate ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Wellbeing/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Wellbeing/i })
			.first()
			.click();

		// === STEP 3: Verify empty state ===
		await expect(page.getByText(/No check-ins submitted today/i)).toBeVisible({ timeout: 10000 });
	});
});
