import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedReadingDiary,
	seedReadingEntries,
} from "./helpers/seed-data";

/**
 * Parent Reading Diary E2E Journey
 * Tests: logging a reading session, viewing reading history,
 * current book / reading level display, feature disabled state.
 */
test.describe("Parent Reading Diary", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-reading-${uniqueURN}@e2e-test.com`;
	});

	test("parent should log a reading session", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Reading School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-rd-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Reading Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { readingDiaryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ella",
			lastName: "Green",
		});

		await seedReadingDiary({
			childId: child.id,
			schoolId: school.id,
		});

		// === STEP 4: Navigate to reading diary ===
		await page.reload();
		await page
			.getByRole("link", { name: /Reading/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reading/);

		// === STEP 5: Fill in reading log form ===
		await expect(page.getByRole("heading", { name: /Log Reading/i })).toBeVisible({ timeout: 10000 });

		await page.getByLabel(/Book Title/i).fill("The BFG");
		await page.getByLabel(/Minutes/i).fill("20");
		await page.getByLabel(/Read With/i).selectOption("PARENT");

		// === STEP 6: Submit ===
		await page.getByRole("button", { name: /Submit/i }).click();

		// === STEP 7: Verify entry appears ===
		await page.waitForTimeout(1000);
		await expect(page.getByText("The BFG")).toBeVisible({ timeout: 10000 });
	});

	test("parent should see reading history", async ({ page }) => {
		// === STEP 1: Setup school + register ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`History Reading ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-rh-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("History Reading Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with reading history ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { readingDiaryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Liam",
			lastName: "Baker",
		});

		const diary = await seedReadingDiary({
			childId: child.id,
			schoolId: school.id,
			currentBook: "Matilda",
		});

		await seedReadingEntries({
			diaryId: diary.id,
			daysBack: 7,
		});

		// === STEP 3: Navigate and verify history ===
		await page.reload();
		await page
			.getByRole("link", { name: /Reading/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reading/);

		// Should see reading entries in the list
		await expect(page.getByText(/Read well today/i).first()).toBeVisible({ timeout: 10000 });
	});

	test("parent should see current book and reading level", async ({ page }) => {
		// === STEP 1: Setup school + register ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Book Level ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-bl-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Book Level Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with current book and level ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { readingDiaryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Maya",
			lastName: "Clark",
		});

		await seedReadingDiary({
			childId: child.id,
			schoolId: school.id,
			currentBook: "Harry Potter and the Philosopher's Stone",
			readingLevel: "Gold",
		});

		// === STEP 3: Navigate and verify book + level ===
		await page.reload();
		await page
			.getByRole("link", { name: /Reading/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reading/);

		await expect(page.getByText("Harry Potter and the Philosopher's Stone")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Gold")).toBeVisible();
	});

	test("reading diary page should show disabled state", async ({ page }) => {
		// === STEP 1: Setup without enabling reading diary ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Reading ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nord-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Reading Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed child but DON'T enable reading diary
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 2: Navigate directly to reading diary ===
		await page.goto("http://localhost:3000/dashboard/reading");

		// === STEP 3: Should show disabled message ===
		await expect(
			page.getByRole("heading", { name: /Reading Diary is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
