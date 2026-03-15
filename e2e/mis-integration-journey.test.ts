import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
} from "./helpers/seed-data";

/**
 * MIS Integration E2E Journey
 * Tests: CSV student upload, sync history, error handling for invalid CSV,
 * and feature disabled state.
 */
test.describe("MIS Integration", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `admin-mis-${uniqueURN}@e2e-test.com`;
	});

	test("admin should upload student CSV", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`MIS Upload School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("MIS Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable MIS integration ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { misIntegrationEnabled: true } });

		// === STEP 4: Navigate to MIS page ===
		await page.reload();
		await page
			.getByRole("link", { name: /MIS Integration/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/mis/);

		// === STEP 5: Verify CSV Upload section is visible ===
		await expect(page.getByText("CSV Upload")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Upload Students CSV")).toBeVisible();

		// === STEP 6: Create CSV content and upload via file input ===
		const csvContent = [
			"first_name,last_name,date_of_birth,year_group,class_name",
			"John,Doe,2015-01-15,4,4A",
			"Emily,Clark,2014-09-22,5,5B",
			"Oliver,Williams,2016-03-10,3,3C",
		].join("\n");

		const fileInput = page.locator('input[type="file"][accept=".csv"]').first();
		await fileInput.setInputFiles({
			name: "students.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csvContent),
		});

		// === STEP 7: Click Upload button (first one, for students) ===
		await page.getByRole("button", { name: /^Upload$/i }).first().click();

		// === STEP 8: Verify sync result shows created count ===
		await expect(page.getByText(/3 created/i)).toBeVisible({ timeout: 15000 });
	});

	test("admin should see sync history", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`MIS History School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("History Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable MIS integration ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { misIntegrationEnabled: true } });

		// === STEP 4: Navigate to MIS page ===
		await page.reload();
		await page
			.getByRole("link", { name: /MIS Integration/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/mis/);

		// === STEP 5: Upload a CSV to generate sync history ===
		const csvContent = [
			"first_name,last_name,date_of_birth,year_group,class_name",
			"Alice,Brown,2015-05-20,4,4A",
		].join("\n");

		const fileInput = page.locator('input[type="file"][accept=".csv"]').first();
		await fileInput.setInputFiles({
			name: "students.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csvContent),
		});

		await page.getByRole("button", { name: /^Upload$/i }).first().click();
		await expect(page.getByText(/1 created/i)).toBeVisible({ timeout: 15000 });

		// === STEP 6: Verify sync history table shows an entry ===
		await expect(page.getByText("Sync History")).toBeVisible({ timeout: 10000 });

		// The sync history table should have a row with status and record counts
		await expect(async () => {
			await page.reload();
			const historySection = page.locator("text=Sync History").locator("..").locator("..");
			await expect(historySection.getByText(/SUCCESS|PARTIAL/i).first()).toBeVisible({ timeout: 5000 });
		}).toPass({ timeout: 15000 });
	});

	test("admin should see errors for invalid CSV", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`MIS Error School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Error Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable MIS integration ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { misIntegrationEnabled: true } });

		// === STEP 4: Navigate to MIS page ===
		await page.reload();
		await page
			.getByRole("link", { name: /MIS Integration/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/mis/);

		// === STEP 5: Upload CSV with bad data (missing required fields) ===
		const badCsvContent = [
			"first_name,last_name,date_of_birth,year_group,class_name",
			"Valid,Student,2015-01-15,4,4A",
			",MissingFirst,,4,4B",
			"NoDate,Smith,,5,5A",
		].join("\n");

		const fileInput = page.locator('input[type="file"][accept=".csv"]').first();
		await fileInput.setInputFiles({
			name: "bad-students.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(badCsvContent),
		});

		await page.getByRole("button", { name: /^Upload$/i }).first().click();

		// === STEP 6: Verify error table shows row-level issues ===
		await expect(page.getByText(/errors/i)).toBeVisible({ timeout: 15000 });

		// The error table should show row numbers with error details
		await expect(page.locator("table").locator("text=Row").first()).toBeVisible({ timeout: 5000 });
	});

	test("MIS page should show disabled state", async ({ page }) => {
		// === STEP 1: Setup school without enabling MIS ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No MIS ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No MIS Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Navigate directly to MIS page ===
		await page.goto("http://localhost:3000/dashboard/mis");

		// === STEP 3: Should show disabled message ===
		await expect(
			page.getByRole("heading", { name: /MIS Integration is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
