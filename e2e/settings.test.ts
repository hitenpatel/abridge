import { expect, test } from "@playwright/test";

/**
 * Settings page journeys: Parent settings, admin school settings, profile updates
 */
test.describe("Settings Page - Parent", () => {
	let parentEmail: string;
	let parentName: string;

	test.beforeEach(async ({ page }) => {
		parentEmail = `e2e-settings-${Date.now()}@test.com`;
		parentName = "Settings Test Parent";

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill(parentName);
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
	});

	test("should navigate to settings page and show Profile and Notifications cards", async ({
		page,
	}) => {
		await page.getByRole("link", { name: "Settings" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/settings/);

		await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
	});

	test("should not show School Settings card for parent", async ({ page }) => {
		await page.getByRole("link", { name: "Settings" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/settings/);

		await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "School Settings" })).not.toBeVisible();
	});

	test("should update profile name", async ({ page }) => {
		await page.getByRole("link", { name: "Settings" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/settings/);

		const nameInput = page.locator("#settings-name");
		await expect(nameInput).toBeVisible();
		await nameInput.clear();
		await nameInput.fill("Updated Parent Name");

		await page.getByRole("button", { name: /Save Profile/i }).click();
		await expect(page.getByText(/Profile saved/i)).toBeVisible({ timeout: 5000 });
	});

	test("should update notification preferences", async ({ page }) => {
		await page.getByRole("link", { name: "Settings" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/settings/);

		// Toggle push notifications off
		const pushToggle = page.getByRole("switch", { name: /Push notifications/i });
		await expect(pushToggle).toBeVisible();
		await pushToggle.click();

		await page.getByRole("button", { name: /Save Notifications/i }).click();
		await expect(page.getByText(/Notification preferences saved/i)).toBeVisible({
			timeout: 5000,
		});
	});
});

test.describe("Settings Page - Admin", () => {
	let adminEmail: string;
	let uniqueURN: string;
	let schoolName: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		schoolName = `Settings Test School ${uniqueURN}`;
		adminEmail = `admin-settings-${uniqueURN}@e2e-test.com`;
	});

	test("admin should see School Settings card", async ({ page }) => {
		// Setup school
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// Register as admin
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Admin Settings User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Wait for admin role to sync (Staff Management is admin-only)
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Staff Management/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		// Navigate to settings
		await page.getByRole("link", { name: "Settings" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/settings/);

		// All three cards should be visible (Profile/Notifications load async)
		await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 10000 });
		await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "School Settings" })).toBeVisible({ timeout: 10000 });
	});

	test("admin should update school settings", async ({ page }) => {
		// Setup school
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// Register as admin
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Admin Settings User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Wait for admin role to sync
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Settings/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		// Navigate to settings
		await page.getByRole("link", { name: "Settings" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/settings/);

		// Wait for School Settings card to appear
		await expect(page.getByRole("heading", { name: "School Settings" })).toBeVisible({ timeout: 10000 });

		// Update school name
		const schoolNameInput = page.locator("#school-name");
		await expect(schoolNameInput).toBeVisible();
		await schoolNameInput.clear();
		await schoolNameInput.fill("Updated School Name");

		await page.getByRole("button", { name: /Save School Settings/i }).click();
		await expect(page.getByText(/School settings saved/i)).toBeVisible({ timeout: 5000 });
	});
});
