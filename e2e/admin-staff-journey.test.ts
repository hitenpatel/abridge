import { expect, test } from "@playwright/test";

/**
 * Full admin journey: Setup school → Register as admin → Manage staff → Invite teacher
 */
test.describe("Admin & Staff Management Journey", () => {
	let adminEmail: string;
	let uniqueURN: string;
	let schoolName: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		schoolName = `Admin Test School ${uniqueURN}`;
		adminEmail = `admin-${uniqueURN}@e2e-test.com`;
	});

	test("full admin journey: setup school, register, manage staff", async ({ page }) => {
		// === Step 1: Create School ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();

		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === Step 2: Register as Admin ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);

		await page.getByLabel("Full Name").fill("Admin User");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();

		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === Step 3: Wait for staff role to sync and navigate to Staff Management ===
		// The admin role may take a reload to sync
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("link", { name: /Staff Management/i }).first(),
			).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		await page.getByRole("link", { name: /Staff Management/i }).first().click();

		// === Step 4: Verify Staff Management Page ===
		await expect(page.getByRole("heading", { name: /Staff Management/i })).toBeVisible();
		await expect(page.getByText("Current Staff")).toBeVisible();

		// Admin should see themselves in the staff list (within the main content area)
		await expect(page.getByRole("main").getByText("Admin User")).toBeVisible();

		// === Step 5: Invite a Teacher ===
		await page.getByRole("button", { name: "Invite", exact: true }).click();

		const teacherEmail = `teacher-${uniqueURN}@e2e-test.com`;
		await page.getByLabel("Email Address").fill(teacherEmail);
		await page.getByLabel("Role").selectOption("TEACHER");
		await page.getByRole("button", { name: /Send Invitation/i }).click();

		// Verify invitation appears
		await expect(page.getByText(teacherEmail)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Pending Invitations")).toBeVisible();
	});

	test("invited staff can register and get correct role", async ({ page }) => {
		// === Setup: Create school and admin ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// Register admin
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Admin For Invite");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to Staff Management
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("link", { name: /Staff Management/i }).first(),
			).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });
		await page.getByRole("link", { name: /Staff Management/i }).first().click();

		// Invite teacher
		await page.getByRole("button", { name: "Invite", exact: true }).click();
		const teacherEmail = `teacher-invite-${uniqueURN}@e2e-test.com`;
		await page.getByLabel("Email Address").fill(teacherEmail);
		await page.getByLabel("Role").selectOption("TEACHER");
		await page.getByRole("button", { name: /Send Invitation/i }).click();
		await expect(page.getByText(teacherEmail)).toBeVisible({ timeout: 10000 });

		// Get the invitation link - click "Copy Link"
		// Since we can't easily copy from clipboard in tests, we'll navigate directly
		// The invite link format is: /register?token={token}
		// We'll look for the token from the pending invitations display
		const copyBtn = page.getByRole("button", { name: /Copy Link/i }).first();
		await expect(copyBtn).toBeVisible();

		// Now sign out and register as the teacher using the invite flow
		// For testing, we'll navigate to register page directly
		// (In real usage, the teacher would click the copied link)

		// Sign out first - go to main dashboard to find sign out
		await page.goto("http://localhost:3000/dashboard");
		await page.getByRole("button", { name: /Sign Out/i }).click();
		await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

		// Teacher registers (without token, they register as a regular parent)
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Teacher User");
		await page.getByLabel("Email Address").fill(teacherEmail);
		await page.getByLabel("Password").fill("TeacherPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();

		// Teacher should see dashboard
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Teacher should see staff role indicator (their invite was auto-accepted on signup)
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByText("Staff (TEACHER)").first(),
			).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });
	});

	test("admin sees correct role-based navigation", async ({ page }) => {
		// Setup school and register admin
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Admin Nav Test");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Wait for admin role to load
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("link", { name: /Staff Management/i }).first(),
			).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// Admin should see staff navigation
		await expect(page.getByRole("link", { name: "Dashboard", exact: true }).first()).toBeVisible();
		await expect(page.getByRole("link", { name: "Attendance", exact: true }).first()).toBeVisible();
		await expect(page.getByRole("link", { name: "Payments", exact: true }).first()).toBeVisible();
		await expect(page.getByRole("link", { name: "Messages", exact: true }).first()).toBeVisible();

		// Admin should also see admin-only nav
		await expect(page.getByRole("link", { name: /Staff Management/i }).first()).toBeVisible();

		// Admin should NOT see parent-only nav like "Forms" or "Calendar"
		// (Staff nav doesn't include "Forms" or direct "Calendar" links)
		await expect(page.getByRole("link", { name: "Forms", exact: true })).not.toBeVisible();
	});
});
