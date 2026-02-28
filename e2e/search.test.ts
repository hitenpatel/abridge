import { expect, test } from "@playwright/test";
import {
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedMessage,
} from "./helpers/seed-data";

/**
 * Search functionality tests
 *
 * The search input exists on the messages page sidebar.
 * There is no global search bar in the dashboard header.
 */
test.describe("Search Functionality", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-search-${uniqueURN}@e2e-test.com`;
	});

	test("messages page should have a search input", async ({ page }) => {
		// Step 1: Setup school and parent
		const schoolName = `Search Test School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Search Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Navigate to messages page
		await page.getByRole("link", { name: "Messages" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/messages/);

		// Step 3: Verify search input is present
		const searchInput = page.getByPlaceholder(/Search messages/i);
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test("messages page should show seeded messages", async ({ page }) => {
		// Step 1: Setup school and parent
		const schoolName = `Msg Search School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Msg Search Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and message
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Search",
			lastName: "Child",
		});

		await seedMessage({
			schoolId: school.id,
			childId: child.id,
			subject: "School Trip to London Zoo",
			body: "We are organizing a trip to London Zoo next month",
			category: "STANDARD",
		});

		// Step 3: Navigate to messages page and verify message appears
		await page.getByRole("link", { name: "Messages" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/messages/);

		// The seeded message should appear in the messages list
		await expect(page.getByText(/School Trip to London Zoo/i).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("messages page should show empty state when no messages", async ({ page }) => {
		// Step 1: Setup school and register
		const schoolName = `Empty Msg School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Msgs Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Navigate to messages page
		await page.getByRole("link", { name: "Messages" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/messages/);

		// Step 3: Verify empty state
		await expect(page.getByText(/No messages yet/i)).toBeVisible({ timeout: 10000 });
	});
});
