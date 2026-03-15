import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedVisitor,
	seedVisitorSignIn,
} from "./helpers/seed-data";

/**
 * Visitor Management E2E Journey
 * Tests: visitor sign-in, sign-out, autocomplete for returning visitors,
 * DBS register management, and feature disabled state.
 */
test.describe("Visitor Management", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `admin-visitor-${uniqueURN}@e2e-test.com`;
	});

	test("staff should sign in a new visitor", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Visitor School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Visitor Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable visitor management ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { visitorManagementEnabled: true } });

		// === STEP 4: Navigate to visitors page ===
		await page.reload();
		await page
			.getByRole("link", { name: /Visitors/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/visitors/);

		// === STEP 5: Verify Sign In tab is visible ===
		await expect(page.getByText("Sign In Visitor")).toBeVisible({ timeout: 10000 });

		// === STEP 6: Fill in visitor details ===
		await page.getByPlaceholder("Search or enter visitor name...").fill("Jane Thompson");
		await page.waitForTimeout(500);

		// Click "+ New visitor" to expand new visitor fields
		const newVisitorButton = page.getByText(/\+ New visitor/i);
		if (await newVisitorButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await newVisitorButton.click();
		}

		// Select purpose
		await page.locator("#visitor-purpose").selectOption("MEETING");

		// Fill badge number
		await page.getByPlaceholder("e.g. V001").fill("V042");

		// === STEP 7: Click Sign In ===
		await page.getByRole("button", { name: /^Sign In$/i }).click();

		// === STEP 8: Verify success message ===
		await expect(page.getByText("Visitor signed in successfully")).toBeVisible({ timeout: 10000 });

		// === STEP 9: Check On Site tab ===
		await page.getByRole("button", { name: /On Site/i }).click();
		await expect(page.getByText("Jane Thompson")).toBeVisible({ timeout: 10000 });
	});

	test("staff should sign out a visitor", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`SignOut School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("SignOut Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { visitorManagementEnabled: true } });

		const visitor = await seedVisitor({
			schoolId: school.id,
			name: "Bob Builder",
			organisation: "Fix-It Corp",
		});
		await seedVisitorSignIn({
			schoolId: school.id,
			visitorId: visitor.id,
			signedInBy: user.id,
			purpose: "MAINTENANCE",
		});

		// === STEP 4: Navigate to visitors and go to On Site tab ===
		await page.reload();
		await page
			.getByRole("link", { name: /Visitors/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/visitors/);

		await page.getByRole("button", { name: /On Site/i }).click();

		// === STEP 5: Verify visitor is visible ===
		await expect(page.getByText("Bob Builder")).toBeVisible({ timeout: 10000 });

		// === STEP 6: Click Sign Out ===
		await page.getByRole("button", { name: /Sign Out/i }).click();

		// === STEP 7: Verify visitor is removed from on site list ===
		await expect(page.getByText("Bob Builder")).not.toBeVisible({ timeout: 10000 });
		await expect(page.getByText("No visitors currently on site")).toBeVisible({ timeout: 5000 });
	});

	test("staff should see autocomplete for returning visitors", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Autocomplete School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Autocomplete Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed a regular visitor ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { visitorManagementEnabled: true } });

		await seedVisitor({
			schoolId: school.id,
			name: "Margaret Henderson",
			organisation: "Henderson & Co",
			isRegular: true,
		});

		// === STEP 4: Navigate to visitors ===
		await page.reload();
		await page
			.getByRole("link", { name: /Visitors/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/visitors/);

		// === STEP 5: Start typing the visitor name ===
		await page.getByPlaceholder("Search or enter visitor name...").fill("Marg");

		// === STEP 6: Verify suggestion appears ===
		await expect(page.getByText("Margaret Henderson")).toBeVisible({ timeout: 10000 });
	});

	test("staff should manage DBS register", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`DBS School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("DBS Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { visitorManagementEnabled: true } });

		// === STEP 4: Navigate to visitors and DBS Register tab ===
		await page.reload();
		await page
			.getByRole("link", { name: /Visitors/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/visitors/);

		await page.getByRole("button", { name: /DBS Register/i }).click();

		// === STEP 5: Click Add DBS ===
		await page.getByRole("button", { name: /Add DBS/i }).click();
		await expect(page.getByText("Add DBS Record")).toBeVisible({ timeout: 5000 });

		// === STEP 6: Fill in DBS form ===
		await page.locator("#dbs-name").fill("Sarah Volunteer");
		await page.locator("#dbs-number").fill("DBS-001234567");
		await page.locator("#dbs-type").selectOption("ENHANCED");
		await page.locator("#dbs-issue").fill("2025-06-15");
		await page.locator("#dbs-expiry").fill("2028-06-15");

		// === STEP 7: Save DBS Record ===
		await page.getByRole("button", { name: /Save DBS Record/i }).click();

		// === STEP 8: Verify record appears in the table with status badge ===
		await expect(page.getByText("Sarah Volunteer")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("DBS-001234567")).toBeVisible();
		await expect(page.getByText("Valid").first()).toBeVisible();
	});

	test("visitor page should show disabled state", async ({ page }) => {
		// === STEP 1: Setup school without enabling visitor management ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No VM ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No VM Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Navigate directly to visitors page ===
		await page.goto("http://localhost:3000/dashboard/visitors");

		// === STEP 3: Should show disabled message ===
		await expect(
			page.getByRole("heading", { name: /Visitor Management is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
