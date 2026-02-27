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
 * Staff Report Card Management E2E Journey
 * Tests: report management view, seeded cycle listing, child completion tracking,
 * create a report cycle.
 */
test.describe("Staff Report Card Management", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `staff-rc-${uniqueURN}@e2e-test.com`;
	});

	test("staff should see report management view", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`RC School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("RC Staff User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("RCPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable report cards feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });

		// === STEP 4: Wait for staff nav to sync and navigate ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reports/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reports/);

		// === STEP 5: Verify staff management view elements ===
		await expect(page.getByRole("heading", { name: "Report Cycles" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByRole("button", { name: /Create Cycle/i })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Manage report cards and cycles")).toBeVisible({ timeout: 10000 });
	});

	test("staff should see seeded report cycle in list", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`RC Cycle School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("RC Cycle Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("RCCyclePass123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });
		await seedReportCycle({
			schoolId: school.id,
			createdBy: user.id,
			name: "Spring Term E2E",
		});

		// === STEP 4: Navigate to reports ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reports/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reports/);

		// === STEP 5: Verify seeded cycle appears ===
		await expect(page.getByText("Spring Term E2E")).toBeVisible({ timeout: 10000 });
	});

	test("staff should see child completion tracking", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`RC Track School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("RC Track Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("RCTrackPass123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data - cycle, child, and report card ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });

		const cycle = await seedReportCycle({
			schoolId: school.id,
			createdBy: user.id,
			name: "Tracking Cycle E2E",
		});

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emma",
			lastName: "Wilson",
		});

		await seedReportCard({
			cycleId: cycle.id,
			childId: child.id,
			schoolId: school.id,
			teacherId: user.id,
			generalComment: "Excellent progress this term.",
		});

		// === STEP 4: Navigate to reports ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reports/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reports/);

		// === STEP 5: Click into the cycle to see children ===
		await expect(page.getByText("Tracking Cycle E2E")).toBeVisible({ timeout: 10000 });
		await page.getByText("Tracking Cycle E2E").click();

		// === STEP 6: Verify child appears in tracking list ===
		await expect(page.getByText("Emma Wilson")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/3 subjects/i)).toBeVisible({ timeout: 10000 });
	});

	test("staff should be able to create a report cycle", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`RC Create School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register with admin email ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("RC Create Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("RCCreatePass123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { reportCardsEnabled: true } });

		// === STEP 4: Navigate to reports ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reports/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reports/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reports/);

		// === STEP 5: Click Create Cycle button ===
		await page.getByRole("button", { name: /Create Cycle/i }).click();

		// === STEP 6: Fill in the cycle form ===
		await page.getByLabel("Cycle Name").fill("E2E Test Cycle");
		await page.getByLabel("Publish Date").fill("2026-07-15");

		// === STEP 7: Submit the form ===
		await page.getByRole("button", { name: /Save/i }).click();

		// === STEP 8: Verify the new cycle appears in the list ===
		await expect(page.getByText("E2E Test Cycle")).toBeVisible({ timeout: 10000 });
	});
});
