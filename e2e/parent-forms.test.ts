import { expect, test } from "@playwright/test";
import {
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedFormTemplate,
} from "./helpers/seed-data";

/**
 * Parent forms journey: View forms + Submit form
 */
test.describe("Parent Forms Journey", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-forms-${uniqueURN}@e2e-test.com`;
	});

	test("parent should view available forms for their child", async ({ page }) => {
		// Step 1: Setup school and parent
		const schoolName = `Forms Test School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Forms Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and forms
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ava",
			lastName: "Wilson",
		});

		// Create form templates
		await seedFormTemplate({
			schoolId: school.id,
			title: "Medical Consent Form",
			description: "Please provide medical information for your child",
		});

		await seedFormTemplate({
			schoolId: school.id,
			title: "Photo Permission",
			description: "Permission for photos during school events",
		});

		// Step 3: Navigate to forms page
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		// Step 4: Verify forms page heading
		await expect(page.getByRole("heading", { name: /Forms & Consent/i })).toBeVisible();

		// Step 5: Verify form templates appear
		await expect(page.getByText("Medical Consent Form")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Photo Permission")).toBeVisible({ timeout: 5000 });

		// Verify descriptions
		await expect(page.getByText(/medical information/i)).toBeVisible();
		await expect(page.getByText(/photos during school events/i)).toBeVisible();
	});

	test("parent should be able to open and view a form", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `View Form School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("View Form Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and form
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "James",
			lastName: "Moore",
		});

		const form = await seedFormTemplate({
			schoolId: school.id,
			title: "Emergency Contact Form",
			description: "Please provide emergency contact details",
		});

		// Step 3: Navigate to forms and click on a form
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		// Wait for forms to load
		await expect(page.getByText("Emergency Contact Form").first()).toBeVisible({ timeout: 10000 });

		// Click on the form link (it's a Link component with the form title)
		await page
			.getByRole("link", { name: /Emergency Contact Form/i })
			.first()
			.click();

		// Step 4: Verify form detail page loads
		// Should navigate to /dashboard/forms/[formId]?childId=[childId]
		await expect(page).toHaveURL(/\/dashboard\/forms\/[a-zA-Z0-9_-]+\?childId=/);

		// Verify form title is displayed on detail page
		await expect(
			page.getByRole("heading", { name: /Emergency Contact Form/i }).first(),
		).toBeVisible({ timeout: 5000 });

		// Verify form fields are present (from our seeded template)
		// The form renderer shows field labels
		await expect(page.getByText(/allergies/i)).toBeVisible({ timeout: 5000 });
	});

	test("parent should see empty state when no forms are available", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `No Forms School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Forms Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child but NO forms
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emily",
			lastName: "Anderson",
		});

		// Step 3: Navigate to forms
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		// Step 4: Verify empty state
		await expect(
			page.getByText(/no forms|no pending forms|all forms completed/i).first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("parent should see child selector when they have multiple children", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Multi Child Forms School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Multi Child Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed 2 children
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		const child1 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Mason",
			lastName: "Thomas",
		});

		const child2 = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Harper",
			lastName: "Thomas",
		});

		// Create a form template
		await seedFormTemplate({
			schoolId: school.id,
			title: "Trip Permission",
			description: "Permission for upcoming school trip",
		});

		// Step 3: Navigate to forms
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		// Step 4: Verify both children are displayed as sections
		// Forms page shows a section for each child with their name
		await expect(page.getByText("Mason Thomas").first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Harper Thomas").first()).toBeVisible({ timeout: 5000 });

		// Verify form is shown under one of the children
		await expect(page.getByText("Trip Permission").first()).toBeVisible({ timeout: 5000 });
	});
});
