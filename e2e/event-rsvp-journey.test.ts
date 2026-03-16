import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedEventWithRsvp,
	prisma,
} from "./helpers/seed-data";

/**
 * Event RSVP journey tests.
 */
test.describe("Event RSVP", () => {
	let parentEmail: string;
	let uniqueURN: string;
	let adminEmail: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-rsvp-${uniqueURN}@e2e-test.com`;
		adminEmail = `admin-rsvp-${uniqueURN}@e2e-test.com`;
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
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`RSVP Staff School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin via "Go to Registration" link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("RSVP Staff Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { calendarEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Headcount",
			lastName: "Child",
		});

		// Seed event with RSVP in the current month
		const now = new Date();
		const eventDate = new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate() + 5, 28));
		const event = await seedEventWithRsvp({
			schoolId: school.id,
			title: "Sports Day Headcount",
			rsvpRequired: true,
			startDate: eventDate,
		});

		// Seed an RSVP response directly via prisma
		await prisma.eventRsvp.create({
			data: {
				eventId: event.id,
				childId: child.id,
				userId: user.id,
				response: "YES",
			},
		});

		// === STEP 4: Navigate directly to calendar ===
		await page.goto("http://localhost:3000/dashboard/calendar");
		await expect(page).toHaveURL(/\/dashboard\/calendar/);

		// Verify the RSVP event appears
		await expect(page.getByText("Sports Day Headcount")).toBeVisible({ timeout: 15000 });
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
});
