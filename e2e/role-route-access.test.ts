import { expect, test } from "@playwright/test";

/**
 * Tests that all roles can navigate to their expected routes without 404 errors.
 */
test.describe("Role-based Route Access", () => {
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
	});

	test("admin can navigate to all staff and admin routes without 404", async ({ page }) => {
		const schoolName = `Route Test School ${uniqueURN}`;
		const adminEmail = `admin-route-${uniqueURN}@e2e-test.com`;

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
		await page.getByLabel("Full Name").fill("Admin Route Test");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Wait for admin role to sync
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Staff Management/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		// Admin nav routes to test (staff nav + admin nav)
		const adminRoutes = [
			{ name: "Dashboard", href: "/dashboard" },
			{ name: "Attendance", href: "/dashboard/attendance" },
			{ name: "Payments", href: "/dashboard/payments" },
			{ name: "Messages", href: "/dashboard/messages" },
			{ name: "Staff Management", href: "/dashboard/staff" },
		];

		for (const route of adminRoutes) {
			await page.goto(`http://localhost:3000${route.href}`);
			// Should NOT show 404
			await expect(page.getByText("404")).not.toBeVisible({ timeout: 5000 });
			// Should still be on the expected URL (no redirect to error page)
			await expect(page).toHaveURL(new RegExp(route.href.replace("/", "\\/")));
		}
	});

	test("parent can navigate to all parent routes without 404", async ({ page }) => {
		const parentEmail = `parent-route-${uniqueURN}@e2e-test.com`;

		// Register as parent
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Parent Route Test");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Parent nav routes
		const parentRoutes = [
			{ name: "Dashboard", href: "/dashboard" },
			{ name: "Attendance", href: "/dashboard/attendance" },
			{ name: "Calendar", href: "/dashboard/calendar" },
			{ name: "Messages", href: "/dashboard/messages" },
			{ name: "Forms", href: "/dashboard/forms" },
			{ name: "Payments", href: "/dashboard/payments" },
		];

		for (const route of parentRoutes) {
			await page.goto(`http://localhost:3000${route.href}`);
			// Should NOT show 404
			await expect(page.getByText("404")).not.toBeVisible({ timeout: 5000 });
			// Should still be on the expected URL
			await expect(page).toHaveURL(new RegExp(route.href.replace("/", "\\/")));
		}
	});

	test("admin nav links resolve correctly when clicked", async ({ page }) => {
		const schoolName = `Nav Click School ${uniqueURN}`;
		const adminEmail = `admin-click-${uniqueURN}@e2e-test.com`;

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
		await page.getByLabel("Full Name").fill("Admin Click Test");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Wait for admin role to sync
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Staff Management/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		// Click each nav item and verify no 404
		// Attendance
		await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/attendance/);
		await expect(page.getByText("404")).not.toBeVisible({ timeout: 3000 });

		// Payments
		await page.getByRole("link", { name: "Payments", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/payments/);
		await expect(page.getByText("404")).not.toBeVisible({ timeout: 3000 });

		// Messages
		await page.getByRole("link", { name: "Messages", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/messages/);
		await expect(page.getByText("404")).not.toBeVisible({ timeout: 3000 });

		// Staff Management (admin only)
		await page
			.getByRole("link", { name: /Staff Management/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/staff/);
		await expect(page.getByRole("heading", { name: /Staff Management/i })).toBeVisible();
	});
});
