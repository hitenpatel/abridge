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
 * Staff Reading Diary Dashboard E2E Journey
 * Tests: class reading overview, updating reading level,
 * adding teacher comment to an entry.
 */
test.describe("Staff Reading Diary Dashboard", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `staff-rd-${uniqueURN}@e2e-test.com`;
	});

	test("teacher should see class reading overview", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Staff Reading ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Staff Reading User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("StaffPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { readingDiaryEnabled: true } });

		// Seed multiple children with diaries and entries
		const child1 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Alice",
			lastName: "Turner",
		});

		const child2 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ben",
			lastName: "Wright",
		});

		const diary1 = await seedReadingDiary({
			childId: child1.id,
			schoolId: school.id,
			currentBook: "Charlie and the Chocolate Factory",
			readingLevel: "Turquoise",
		});

		const diary2 = await seedReadingDiary({
			childId: child2.id,
			schoolId: school.id,
			currentBook: "The Gruffalo",
			readingLevel: "Purple",
		});

		await seedReadingEntries({ diaryId: diary1.id, daysBack: 5 });
		await seedReadingEntries({ diaryId: diary2.id, daysBack: 5 });

		// === STEP 3: Navigate to reading diary as staff ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reading/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reading/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reading/);

		// === STEP 4: Verify class overview table with child names ===
		await expect(page.getByText(/Class Reading Overview/i)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Alice Turner")).toBeVisible();
		await expect(page.getByText("Ben Wright")).toBeVisible();
	});

	test("teacher should update reading level", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Level Update ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Level Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("LevelPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { readingDiaryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Clara",
			lastName: "Evans",
		});

		await seedReadingDiary({
			childId: child.id,
			schoolId: school.id,
			currentBook: "Fantastic Mr Fox",
			readingLevel: "Orange",
		});

		// === STEP 3: Navigate to reading diary ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reading/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reading/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reading/);

		// === STEP 4: Navigate to child detail ===
		await expect(page.getByText("Clara Evans")).toBeVisible({ timeout: 10000 });
		await page.getByText("Clara Evans").click();

		// === STEP 5: Update reading level ===
		await expect(page.getByText("Orange")).toBeVisible({ timeout: 10000 });
		await page.getByRole("button", { name: /Edit/i }).first().click();
		await page.getByLabel(/Reading Level/i).clear();
		await page.getByLabel(/Reading Level/i).fill("Turquoise");
		await page.getByRole("button", { name: /Save/i }).click();

		// === STEP 6: Verify updated ===
		await page.waitForTimeout(1000);
		await expect(page.getByText("Turquoise")).toBeVisible({ timeout: 10000 });
	});

	test("teacher should add comment to entry", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Comment RD ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Comment Staff");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("CommentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { readingDiaryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Dylan",
			lastName: "Parker",
		});

		const diary = await seedReadingDiary({
			childId: child.id,
			schoolId: school.id,
			currentBook: "James and the Giant Peach",
		});

		await seedReadingEntries({
			diaryId: diary.id,
			daysBack: 3,
		});

		// === STEP 3: Navigate to reading diary ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Reading/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Reading/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/reading/);

		// === STEP 4: Click on child to view entries ===
		await expect(page.getByText("Dylan Parker")).toBeVisible({ timeout: 10000 });
		await page.getByText("Dylan Parker").click();

		// === STEP 5: Click on an entry and add teacher comment ===
		await expect(page.getByText(/Read well today/i).first()).toBeVisible({ timeout: 10000 });
		await page.getByText(/Read well today/i).first().click();

		await page.getByLabel(/Teacher Comment/i).fill("Great fluency and expression!");
		await page.getByRole("button", { name: /Save/i }).click();

		// === STEP 6: Verify comment saved ===
		await page.waitForTimeout(1000);
		await expect(page.getByText("Great fluency and expression!")).toBeVisible({ timeout: 10000 });
	});
});
