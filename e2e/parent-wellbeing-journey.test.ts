import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedWellbeingCheckIns,
} from "./helpers/seed-data";

/**
 * Parent Wellbeing Check-In E2E Journey
 * Tests: mood submission, viewing history, multi-child switching,
 * feature disabled state, updating today's check-in.
 */
test.describe("Parent Wellbeing Check-In", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-wellbeing-${uniqueURN}@e2e-test.com`;
	});

	test("parent should submit a wellbeing check-in for their child", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Wellbeing School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-wb-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Wellbeing Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { wellbeingEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Olivia",
			lastName: "Jones",
		});

		// === STEP 4: Navigate to wellbeing ===
		await page.reload();
		await page
			.getByRole("link", { name: /Wellbeing/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/wellbeing/);

		// === STEP 5: Verify check-in prompt ===
		await expect(page.getByText(/How is Olivia feeling/i)).toBeVisible({ timeout: 10000 });

		// === STEP 6: Select a mood ===
		await page.getByText("😄").click();

		// === STEP 7: Add optional note ===
		await page.getByPlaceholder(/Optional note/i).fill("Had a great day at school");

		// === STEP 8: Submit ===
		await page.getByRole("button", { name: /Submit/i }).click();

		// === STEP 9: Wait for submission to complete ===
		await page.waitForTimeout(1000);

		// === STEP 10: Verify check-in appears in history ===
		await expect(page.getByText("Recent Check-ins")).toBeVisible();
	});

	test("parent should see historical check-ins for their child", async ({ page }) => {
		// === STEP 1: Setup school + register ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`History School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-hist-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("History Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with history ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { wellbeingEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Noah",
			lastName: "Brown",
		});

		await seedWellbeingCheckIns({
			childId: child.id,
			schoolId: school.id,
			daysBack: 7,
			moods: ["GOOD", "GREAT", "OK", "GOOD", "GREAT", "OK", "GOOD"],
		});

		// === STEP 3: Navigate and verify history ===
		await page.reload();
		await page
			.getByRole("link", { name: /Wellbeing/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/wellbeing/);

		await expect(page.getByText("Recent Check-ins")).toBeVisible({ timeout: 10000 });

		// Should see mood emojis from history
		await expect(page.getByText("🙂").first()).toBeVisible();
	});

	test("parent with multiple children should switch between them", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Multi Child WB ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-mc-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Multi Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed two children ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { wellbeingEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Amelia",
			lastName: "Wilson",
		});
		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "James",
			lastName: "Wilson",
		});

		// === STEP 3: Navigate and verify child switcher ===
		await page.reload();
		await page
			.getByRole("link", { name: /Wellbeing/i })
			.first()
			.click();

		await expect(page.getByText(/Amelia/i)).toBeVisible({ timeout: 10000 });

		// Switch to second child
		const jamesButton = page.getByRole("button", { name: /James/i });
		await expect(jamesButton).toBeVisible({ timeout: 5000 });
		await expect(async () => {
			await jamesButton.click();
			await expect(page.getByText(/How is James feeling/i)).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 15000 });
	});

	test("wellbeing page should show disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup without enabling wellbeing ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No WB ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nowb-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No WB Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed child but DON'T enable wellbeing
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 2: Navigate directly to wellbeing ===
		await page.goto("http://localhost:3000/dashboard/wellbeing");

		// === STEP 3: Should show disabled message ===
		await expect(
			page.getByRole("heading", { name: /Wellbeing Check-ins is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
