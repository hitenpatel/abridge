import { expect, test } from "@playwright/test";
import {
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedEvent,
	seedMessage,
	seedPaymentItem,
} from "./helpers/seed-data";

/**
 * Search functionality tests
 */
test.describe("Search Functionality", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-search-${uniqueURN}@e2e-test.com`;
	});

	test("parent should search for messages", async ({ page }) => {
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

		// Step 2: Seed child and searchable message
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

		// Step 3: Use search bar
		await page.reload();

		// Type in search bar
		const searchInput = page.getByPlaceholder(/Search/i);
		await expect(searchInput).toBeVisible();
		await searchInput.fill("London Zoo");

		// Wait for search results dropdown to appear
		await expect(page.getByRole("button", { name: /London Zoo/i }).first()).toBeVisible({
			timeout: 10000,
		});

		// Verify search result shows message
		await expect(page.getByText(/School Trip to London Zoo/i).first()).toBeVisible();

		// Click on search result
		await page
			.getByRole("button", { name: /London Zoo/i })
			.first()
			.click();

		// Should navigate to messages page
		await expect(page).toHaveURL(/\/dashboard\/messages/);
	});

	test("parent should search for events", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Event Search School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Event Search Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and event
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
		});

		await seedEvent({
			schoolId: school.id,
			title: "Sports Day Competition",
			body: "Annual sports day event for all year groups",
			category: "EVENT",
		});

		// Step 3: Search for event
		await page.reload();

		const searchInput = page.getByPlaceholder(/Search/i);
		await searchInput.fill("Sports Day");

		// Wait for results
		await expect(page.getByRole("button", { name: /Sports Day/i }).first()).toBeVisible({
			timeout: 10000,
		});

		// Click result
		await page
			.getByRole("button", { name: /Sports Day/i })
			.first()
			.click();

		// Should navigate to attendance page (where calendar is)
		await expect(page).toHaveURL(/\/dashboard\/attendance/);
	});

	test("parent should search for payments", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Payment Search School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Payment Search Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and payment
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
		});

		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "School Uniform Purchase",
			description: "PE kit and school jumper",
			amount: 4500,
		});

		// Step 3: Search for payment
		await page.reload();

		const searchInput = page.getByPlaceholder(/Search/i);
		await searchInput.fill("Uniform");

		// Wait for results
		await expect(page.getByRole("button", { name: /School Uniform/i }).first()).toBeVisible({
			timeout: 10000,
		});

		// Click result
		await page
			.getByRole("button", { name: /School Uniform/i })
			.first()
			.click();

		// Should navigate to payments page
		await expect(page).toHaveURL(/\/dashboard\/payments/);
	});

	test("search should show 'No results found' for non-existent query", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `No Results School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Results Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Search for non-existent term
		const searchInput = page.getByPlaceholder(/Search/i);
		await searchInput.fill("XYZ123NonExistent");

		// Wait for dropdown and verify "No results found"
		await expect(page.getByText(/No results found/i)).toBeVisible({ timeout: 3000 });
	});
});
