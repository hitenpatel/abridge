import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
	test("should display hero section with branding", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Verify branding
		await expect(page.getByText("Abridge").first()).toBeVisible();

		// Verify hero heading
		await expect(
			page.getByRole("heading", { name: /Every child.s progress/i }),
		).toBeVisible();

		// Verify CTA buttons
		await expect(page.getByRole("link", { name: /Apply for Early Access/i }).first()).toBeVisible();
		await expect(page.getByText(/See How It Works/i)).toBeVisible();
	});

	test("should display features section", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Verify features heading
		await expect(page.getByRole("heading", { name: /Everything your school needs/i })).toBeVisible();

		// Verify feature cards
		await expect(page.getByRole("heading", { name: "AI Progress Summaries" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Real-time Chat" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Smart Attendance" })).toBeVisible();
	});

	test("should have navigation links to login and register", async ({ page }) => {
		await page.goto("http://localhost:3000");

		// Verify nav links
		const loginLink = page.getByRole("link", { name: /Log in/i });
		const earlyAccessLink = page.getByRole("link", { name: /Apply for Early Access/i }).first();
		await expect(loginLink).toBeVisible();
		await expect(earlyAccessLink).toBeVisible();

		// Verify login link navigates correctly
		await loginLink.click();
		await expect(page).toHaveURL(/\/login/);
	});

	test("should navigate to setup from Apply for Early Access", async ({ page }) => {
		await page.goto("http://localhost:3000");

		await page.getByRole("link", { name: /Apply for Early Access/i }).first().click();
		await expect(page).toHaveURL(/\/setup/);
	});

	test("should display footer with copyright", async ({ page }) => {
		await page.goto("http://localhost:3000");

		await expect(page.getByText(/© \d{4} Abridge\. All rights reserved\./)).toBeVisible();
	});
});
