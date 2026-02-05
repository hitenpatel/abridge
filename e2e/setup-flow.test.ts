import { expect, test } from "@playwright/test";

test.describe("School Setup Flow", () => {
	test("should display setup form with all required fields", async ({ page }) => {
		await page.goto("http://localhost:3000/setup");

		await expect(page.getByRole("heading", { name: /Initial School Setup/i })).toBeVisible();
		await expect(page.getByText("Configure the first school")).toBeVisible();

		// Verify all form fields
		await expect(page.getByLabel("School Name")).toBeVisible();
		await expect(page.getByLabel("Ofsted URN")).toBeVisible();
		await expect(page.getByLabel("Admin Email")).toBeVisible();
		await expect(page.getByLabel("Setup Key")).toBeVisible();

		// Verify submit button
		await expect(page.getByRole("button", { name: /Create School/i })).toBeVisible();
	});

	test("should create a school and show success page", async ({ page }) => {
		const uniqueSchoolName = `E2E Test School ${Date.now()}`;
		const uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		const adminEmail = `admin-${uniqueURN}@e2e-test.com`;

		await page.goto("http://localhost:3000/setup");

		await page.getByLabel("School Name").fill(uniqueSchoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");

		await page.getByRole("button", { name: /Create School/i }).click();

		// Verify success
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(uniqueSchoolName)).toBeVisible();
		await expect(page.getByText(adminEmail)).toBeVisible();

		// Verify "Go to Registration" button exists
		await expect(page.getByRole("link", { name: /Go to Registration/i })).toBeVisible();
	});

	test("should navigate to registration after school creation", async ({ page }) => {
		const uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();

		await page.goto("http://localhost:3000/setup");

		await page.getByLabel("School Name").fill(`Nav Test School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nav-${uniqueURN}@e2e-test.com`);
		await page.getByLabel("Setup Key").fill("admin123");

		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// Click Go to Registration
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
	});

	test("should show error for invalid setup key", async ({ page }) => {
		const uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();

		await page.goto("http://localhost:3000/setup");

		await page.getByLabel("School Name").fill(`Bad Key School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-badkey-${uniqueURN}@e2e-test.com`);
		await page.getByLabel("Setup Key").fill("wrong-key-12345");

		// Listen for alert
		page.on("dialog", async (dialog) => {
			expect(dialog.message()).toContain("Invalid");
			await dialog.accept();
		});

		await page.getByRole("button", { name: /Create School/i }).click();

		// Should remain on setup page (not redirect)
		await page.waitForTimeout(2000);
		await expect(page.getByRole("heading", { name: /Initial School Setup/i })).toBeVisible();
	});
});
