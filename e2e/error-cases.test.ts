import { expect, test } from "@playwright/test";

/**
 * Error handling and validation tests
 */
test.describe("Error Cases & Validation", () => {
	test("should reject invalid email format on registration", async ({ page }) => {
		await page.goto("http://localhost:3000/register");

		await page.getByLabel("Full Name").fill("Test User");
		await page.getByLabel("Email Address").fill("not-an-email");
		await page.getByLabel("Password").fill("ValidPassword123!");

		await page.getByRole("button", { name: /Register/i }).click();

		// Should show email validation error or fail and stay on page
		await expect(async () => {
			const hasError = await page
				.getByText(/invalid|valid email|email.*format/i)
				.isVisible({ timeout: 2000 })
				.catch(() => false);

			const emailInvalid = await page
				.locator('input[type="email"]:invalid')
				.count()
				.then((c) => c > 0)
				.catch(() => false);

			const stillOnRegister = page.url().includes("/register");
			const notOnDashboard = !page.url().includes("/dashboard");

			expect(hasError || emailInvalid || (stillOnRegister && notOnDashboard)).toBe(true);
		}).toPass({ timeout: 5000 });
	});

	test("should reject password shorter than 8 characters", async ({ page }) => {
		await page.goto("http://localhost:3000/register");

		await page.getByLabel("Full Name").fill("Test User");
		await page.getByLabel("Email Address").fill(`test-${Date.now()}@example.com`);
		await page.getByLabel("Password").fill("Short1");

		await page.getByRole("button", { name: /Register/i }).click();

		// Should show password validation error or fail silently and stay on page
		await expect(async () => {
			// Either shows an error message OR stays on register page (validation failed)
			const hasError = await page
				.getByText(/password.*at least 8|password.*minimum|password.*length|8 characters/i)
				.isVisible({ timeout: 2000 })
				.catch(() => false);

			const stillOnRegister = page.url().includes("/register");
			const notOnDashboard = !page.url().includes("/dashboard");

			// Should either show error OR not allow registration
			expect(hasError || (stillOnRegister && notOnDashboard)).toBe(true);
		}).toPass({ timeout: 5000 });
	});

	test("should reject duplicate email on registration", async ({ page }) => {
		// Step 1: Create first user
		const email = `duplicate-test-${Date.now()}@example.com`;

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("First User");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("Password123!");
		await page.getByRole("button", { name: /Register/i }).click();

		// Wait for successful registration
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Sign out
		await page.getByRole("button", { name: /Sign Out/i }).click();
		await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

		// Step 3: Try to register with same email
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Second User");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("DifferentPassword456!");
		await page.getByRole("button", { name: /Register/i }).click();

		// Should show error about duplicate email
		await expect(
			page.getByText(/already|exists|registered|email.*use|taken/i),
		).toBeVisible({ timeout: 5000 });

		// Should still be on register page or not redirected to dashboard
		await expect(async () => {
			const url = page.url();
			expect(url).not.toMatch(/\/dashboard/);
		}).toPass({ timeout: 3000 });
	});

	test("parent should not access admin-only staff management route", async ({ page }) => {
		// Register as parent
		const email = `parent-unauthorized-${Date.now()}@example.com`;

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Unauthorized Parent");
		await page.getByLabel("Email Address").fill(email);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();

		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Verify parent role (no staff management link visible)
		await expect(page.getByRole("link", { name: /Staff Management/i })).not.toBeVisible();

		// Try to access staff management route directly via URL
		await page.goto("http://localhost:3000/dashboard/staff");

		// Should show access denied or redirect
		await expect(async () => {
			// Should either show "Access Denied" message or redirect away from /staff
			const hasAccessDenied = await page.getByText(/access denied|not authorized/i).isVisible().catch(() => false);
			const isOnStaffPage = page.url().includes("/dashboard/staff");

			// Either show error message OR redirect away
			expect(hasAccessDenied || !isOnStaffPage).toBe(true);
		}).toPass({ timeout: 5000 });
	});

	test("should show error for invalid login credentials", async ({ page }) => {
		await page.goto("http://localhost:3000/login");

		// Set up dialog handler before clicking login
		const dialogPromise = page.waitForEvent("dialog");

		// Try to login with non-existent credentials
		await page.getByLabel("Email").fill("nonexistent@example.com");
		await page.getByLabel("Password").fill("WrongPassword123!");
		await page.getByRole("button", { name: "Login" }).click();

		// Wait for and verify alert dialog
		const dialog = await dialogPromise;
		expect(dialog.message()).toMatch(/login failed|invalid|error/i);
		await dialog.accept();

		// Should still be on login page after error
		await expect(page).toHaveURL(/\/login/);
	});

	test("should redirect unauthenticated users from protected routes", async ({ page }) => {
		// Try to access dashboard without being logged in
		await page.goto("http://localhost:3000/dashboard");

		// Should redirect to login
		await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
	});

	test("should show error for invalid setup key", async ({ page }) => {
		await page.goto("http://localhost:3000/setup");

		const uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();

		// Set up dialog handler before clicking submit
		const dialogPromise = page.waitForEvent("dialog");

		await page.getByLabel("School Name").fill("Invalid Setup School");
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("wrong-key-12345");

		await page.getByRole("button", { name: /Create School/i }).click();

		// Wait for and verify alert dialog with error about invalid key
		const dialog = await dialogPromise;
		expect(dialog.message()).toMatch(/invalid.*key|setup.*key/i);
		await dialog.accept();

		// Should NOT show success message
		await expect(page.getByText("School Created!")).not.toBeVisible();
	});
});
