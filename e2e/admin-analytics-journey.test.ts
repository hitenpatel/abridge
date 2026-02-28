import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedAttendanceRecords,
	seedChildForParent,
	seedFormTemplate,
	seedMessage,
	seedPaymentItem,
} from "./helpers/seed-data";

/**
 * Admin Analytics Dashboard E2E Journey
 * Tests: navigation, summary cards, attendance section, payment section,
 * message engagement section, form completion section, date range picker,
 * admin-only access restriction.
 */
test.describe("Admin Analytics Dashboard", () => {
	let adminEmail: string;
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `admin-analytics-${uniqueURN}@e2e-test.com`;
		parentEmail = `parent-analytics-${uniqueURN}@e2e-test.com`;
	});

	test("admin should see analytics dashboard with all sections", async ({ page }) => {
		// === STEP 1: Setup school ===
		const schoolName = `Analytics Test School ${uniqueURN}`;
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Analytics Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed test data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { analyticsEnabled: true },
		});

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Analytics",
			lastName: "Child",
		});

		await seedAttendanceRecords({ childId: child.id, schoolId: school.id, daysBack: 14 });
		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "Dinner Money",
			amount: 1500,
		});
		await seedMessage({ schoolId: school.id, childId: child.id, subject: "Test Message" });
		await seedFormTemplate({ schoolId: school.id, title: "Consent Form" });

		// === STEP 4: Navigate to analytics ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Analytics/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Analytics/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/analytics/);

		// === STEP 5: Verify page heading ===
		await expect(page.getByRole("heading", { name: /Analytics/i })).toBeVisible();

		// === STEP 6: Verify metric cards ===
		await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Forms" })).toBeVisible();

		// === STEP 11: Verify date range picker ===
		await expect(page.getByText("Today")).toBeVisible();
		await expect(page.getByText("This Week")).toBeVisible();
		await expect(page.getByText("This Month")).toBeVisible();

		// Click "This Month" to change date range
		await page.getByText("This Month").click();
		await page.waitForTimeout(500);

		// Data should still be visible after range change
		await expect(page.getByText(/Attendance/i).first()).toBeVisible();
	});

	test("non-admin parent should not see analytics", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Analytics ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-na-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Regular Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Verify analytics link is NOT visible for parent ===
		await page.waitForTimeout(1000);
		const analyticsLink = page.getByRole("link", { name: /Analytics/i });
		await expect(analyticsLink).not.toBeVisible();
	});

	test("analytics with empty data should show zero state", async ({ page }) => {
		// === STEP 1: Setup school + register admin ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Empty Analytics ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Empty Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { analyticsEnabled: true } });

		// === STEP 2: Navigate to analytics ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Analytics/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Analytics/i })
			.first()
			.click();

		// === STEP 3: Verify zero values shown (not errors) ===
		await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("0%").first()).toBeVisible();
		await expect(page.getByText(/0 pending responses/i)).toBeVisible();
	});
});
