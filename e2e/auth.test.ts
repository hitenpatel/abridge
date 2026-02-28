import { expect, test } from "@playwright/test";

test.describe("Authentication Flows", () => {
	test.describe("Login Page", () => {
		test("should display login form", async ({ page }) => {
			await page.goto("http://localhost:3000/login");

			await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
			await expect(page.getByLabel("Email")).toBeVisible();
			await expect(page.getByLabel("Password")).toBeVisible();
			await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
		});

		test("should have link to register page", async ({ page }) => {
			await page.goto("http://localhost:3000/login");

			const registerLink = page.getByRole("link", { name: /Register/i });
			await expect(registerLink).toBeVisible();
			await registerLink.click();
			await expect(page).toHaveURL(/\/register/);
		});

		test("should show error for invalid credentials", async ({ page }) => {
			await page.goto("http://localhost:3000/login");

			await page.getByLabel("Email").fill("nonexistent@example.com");
			await page.getByLabel("Password").fill("wrongpassword");

			await page.getByRole("button", { name: /Sign In/i }).click();

			// Should show inline error text or toast
			await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Register Page", () => {
		test("should display registration form", async ({ page }) => {
			await page.goto("http://localhost:3000/register");

			await expect(page.getByRole("heading", { name: /Create Account/i })).toBeVisible();
			await expect(page.getByText("Join Abridge today")).toBeVisible();
			await expect(page.getByLabel("Full Name")).toBeVisible();
			await expect(page.getByLabel("Email Address")).toBeVisible();
			await expect(page.getByLabel("Password")).toBeVisible();
			await expect(page.getByRole("button", { name: /Register/i })).toBeVisible();
		});

		test("should have link to login page", async ({ page }) => {
			await page.goto("http://localhost:3000/register");

			const loginLink = page.getByRole("link", { name: /Login/i });
			await expect(loginLink).toBeVisible();
			await loginLink.click();
			await expect(page).toHaveURL(/\/login/);
		});

		test("should register a new parent and redirect to dashboard", async ({ page }) => {
			await page.goto("http://localhost:3000/register");

			const uniqueEmail = `e2e-parent-${Date.now()}@test.com`;
			await page.getByLabel("Full Name").fill("E2E Test Parent");
			await page.getByLabel("Email Address").fill(uniqueEmail);
			await page.getByLabel("Password").fill("TestPassword123!");

			await page.getByRole("button", { name: /Register/i }).click();

			// Should redirect to dashboard
			await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
		});
	});

	test.describe("Login-Logout Flow", () => {
		test("should login and then logout successfully", async ({ page }) => {
			// First register a user
			const uniqueEmail = `e2e-logout-${Date.now()}@test.com`;
			await page.goto("http://localhost:3000/register");

			await page.getByLabel("Full Name").fill("Logout Test User");
			await page.getByLabel("Email Address").fill(uniqueEmail);
			await page.getByLabel("Password").fill("TestPassword123!");
			await page.getByRole("button", { name: /Register/i }).click();

			await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

			// Verify user is logged in
			await expect(page.getByText("Logout Test User").first()).toBeVisible();

			// Open user dropdown menu, then click Sign Out
			await page.getByRole("button", { name: /Logout Test User/i }).click();
			await page.getByRole("menuitem", { name: /Sign Out/i }).click();

			// Should redirect to login
			await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
		});
	});

	test.describe("Protected Routes", () => {
		test("dashboard should redirect unauthenticated users to login", async ({ page }) => {
			// Clear any existing session by going to a fresh context
			await page.goto("http://localhost:3000/dashboard");

			// Should eventually redirect to login (dashboard checks session)
			await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
		});
	});
});
