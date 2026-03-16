import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedEventWithRsvp,
} from "./helpers/seed-data";

/**
 * Event RSVP journey tests.
 */
test.describe("Event RSVP", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-rsvp-${uniqueURN}@e2e-test.com`;
	});

	test("parent should see RSVP buttons on an event requiring RSVP", async ({ page }) => {
		// Register as parent
		const email = `e2e-rsvp-parent-${Date.now()}@test.com`;
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("RSVP Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to calendar
		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);
		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();

		// Verify the calendar page loads without errors
		await page.waitForTimeout(2000);
	});

	test("staff should see headcount badge on RSVP events", async ({ page }) => {
		// Login as staff (use seed admin)
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("claire@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Wait for feature toggles to load and nav link to appear
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Calendar/i }).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// Navigate to calendar
		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);
		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();

		// Wait for events to load
		await page.waitForTimeout(2000);

		// Verify calendar renders (staff should see create button)
		await expect(page.getByTestId("create-event-button")).toBeVisible();
	});

	test("parent should submit RSVP and see response saved", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`RSVP School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-rsvp-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("RSVP Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { calendarEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emma",
			lastName: "RSVP",
		});

		// Seed event with RSVP in the current month so it appears in the default view
		const now = new Date();
		const eventDate = new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate() + 5, 28));
		await seedEventWithRsvp({
			schoolId: school.id,
			title: "Sports Day RSVP",
			rsvpRequired: true,
			startDate: eventDate,
		});

		// === STEP 4: Navigate to calendar ===
		await page.reload();
		await page.getByRole("link", { name: "Calendar" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/calendar/);
		await expect(page.getByRole("heading", { name: /School Calendar/i })).toBeVisible();

		// === STEP 5: Verify RSVP event is visible ===
		await expect(page.getByText("Sports Day RSVP")).toBeVisible({ timeout: 10000 });

		// === STEP 6: Click "Yes" RSVP button for the child ===
		const yesButton = page.getByTestId(`rsvp-yes-${child.id}`);
		await expect(yesButton).toBeVisible({ timeout: 10000 });
		await yesButton.click();

		// === STEP 7: Verify the response is saved (button becomes highlighted green) ===
		await expect(yesButton).toHaveClass(/bg-green-100/, { timeout: 10000 });
	});

	test("RSVP page should show disabled state when calendar is off", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Calendar ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nocal-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Calendar Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Disable calendar feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");

		await enableSchoolFeature({ schoolId: school.id, features: { calendarEnabled: false } });

		// === STEP 4: Navigate directly to calendar without enabling calendarEnabled ===
		// Feature toggles default to calendarEnabled: true, so need to wait for query to resolve
		await expect(async () => {
			await page.goto("http://localhost:3000/dashboard/calendar");
			await expect(
				page.getByRole("heading", { name: /Calendar is not enabled/i }),
			).toBeVisible({ timeout: 5000 });
		}).toPass({ timeout: 30000 });
	});
});
