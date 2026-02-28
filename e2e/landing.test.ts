import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
	test("should display hero section with branding", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Verify branding
		await expect(page.getByText("Abridge").first()).toBeVisible();

		// Verify hero heading
		await expect(
			page.getByRole("heading", { name: /School communications, simplified/i }),
		).toBeVisible();

		// Verify CTA buttons
		await expect(page.getByRole("link", { name: /Start Free Trial/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /View Features/i })).toBeVisible();
	});

	test("should display features section", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Verify features heading
		await expect(page.getByRole("heading", { name: /Everything you need/i })).toBeVisible();

		// Verify feature cards
		await expect(page.getByRole("heading", { name: "Instant Updates" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Secure Payments" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Smart Attendance" })).toBeVisible();
	});

	test("should have navigation links to login and register", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Verify nav links
		const loginLink = page.getByRole("link", { name: /Log in/i });
		const getStartedLink = page.getByRole("link", { name: /Get Started/i });
		await expect(loginLink).toBeVisible();
		await expect(getStartedLink).toBeVisible();

		// Verify login link navigates correctly
		await loginLink.click();
		await expect(page).toHaveURL(/\/login/);
	});

	test("should navigate to register from Get Started", async ({ page }) => {
		await page.goto("http://localhost:3000");

		await page.getByRole("link", { name: /Get Started/i }).click();
		await expect(page).toHaveURL(/\/register/);
	});

	test("should display footer with copyright", async ({ page }) => {
		await page.goto("http://localhost:3000");

		await expect(page.getByText("© 2026 Abridge. All rights reserved.")).toBeVisible();
	});
});
