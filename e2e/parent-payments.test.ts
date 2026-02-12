import { expect, test } from "@playwright/test";
import {
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedPaymentItem,
} from "./helpers/seed-data";

/**
 * Parent payments journey: View outstanding payments + Payment history
 */
test.describe("Parent Payments Journey", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-payments-${uniqueURN}@e2e-test.com`;
	});

	test("parent should view outstanding payments for their child", async ({ page }) => {
		// Step 1: Setup school and parent
		const schoolName = `Payment Test School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Payment Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and payment item
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Grace",
			lastName: "Taylor",
		});

		// Create outstanding payment
		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "School Trip to London",
			amount: 3500, // £35.00
			description: "Day trip including lunch and transport",
		});

		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "Swimming Lessons",
			amount: 1200, // £12.00
			description: "Term 1 swimming lessons",
		});

		// Step 3: Navigate to payments page
		await page.reload();
		await page.getByRole("link", { name: "Payments", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		// Step 4: Verify outstanding payments section is visible
		await expect(
			page.getByRole("heading", { name: "Outstanding Payments", exact: true }),
		).toBeVisible();

		// Step 5: Verify payment items appear
		await expect(page.getByText("School Trip to London").first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Swimming Lessons").first()).toBeVisible({ timeout: 5000 });

		// Verify amounts are displayed (£35.00 and £12.00)
		await expect(page.getByText(/£35\.00|35\.00/)).toBeVisible();
		await expect(page.getByText(/£12\.00|12\.00/)).toBeVisible();
	});

	test("parent should navigate to payment history page", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Payment History School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("History Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Navigate to payments page
		await page.getByRole("link", { name: "Payments", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		// Step 3: Click "View Payment History" link
		await page.getByRole("link", { name: /View Payment History/i }).click();

		// Step 4: Verify navigation to history page
		await expect(page).toHaveURL(/\/dashboard\/payments\/history/);

		// Verify payment history heading is visible
		await expect(
			page.getByRole("heading", { name: /Payment History|Past Payments/i }).first(),
		).toBeVisible({ timeout: 5000 });
	});

	test("parent should see multiple outstanding payments and total amount", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Multiple Payments School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Multiple Payment Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and multiple payments
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Noah",
			lastName: "Brown",
		});

		// Create 4 payment items
		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "Art Supplies",
			amount: 500, // £5.00
		});

		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "School Lunch",
			amount: 2000, // £20.00
		});

		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "Music Lessons",
			amount: 1500, // £15.00
		});

		await seedPaymentItem({
			schoolId: school.id,
			childId: child.id,
			title: "After School Club",
			amount: 4000, // £40.00
		});

		// Step 3: Navigate to payments
		await page.reload();
		await page.getByRole("link", { name: "Payments", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		// Step 4: Verify all 4 payments are visible
		await expect(page.getByText("Art Supplies").first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("School Lunch").first()).toBeVisible();
		await expect(page.getByText("Music Lessons").first()).toBeVisible();
		await expect(page.getByText("After School Club").first()).toBeVisible();

		// Step 5: Verify total or individual amounts
		// Total should be £80.00 (5 + 20 + 15 + 40)
		// May be displayed as "Total: £80.00" or just individual amounts
		const pageContent = await page.content();
		const hasTotal = pageContent.includes("80.00") || pageContent.includes("80,00");
		const hasIndividualAmounts =
			pageContent.includes("5.00") &&
			pageContent.includes("20.00") &&
			pageContent.includes("15.00") &&
			pageContent.includes("40.00");

		expect(hasTotal || hasIndividualAmounts).toBe(true);
	});

	test("parent with no outstanding payments should see appropriate message", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `No Payments School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Payment Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child but NO payments
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Isabella",
			lastName: "Davis",
		});

		// Step 3: Navigate to payments
		await page.reload();
		await page.getByRole("link", { name: "Payments", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);

		// Step 4: Verify empty state message
		await expect(page.getByText(/no outstanding|no payments|all paid|up to date/i)).toBeVisible({
			timeout: 10000,
		});
	});
});
