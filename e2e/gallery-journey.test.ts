import { expect, test } from "@playwright/test";

/**
 * Gallery journey tests.
 */
test.describe("Gallery", () => {
	test("staff should see gallery page with album management", async ({ page }) => {
		// Login as staff (use seed admin)
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("claire@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to gallery page
		await page.getByRole("link", { name: "Gallery" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/gallery/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Manage Gallery/i })).toBeVisible();

		// Staff should see Create Album button
		await expect(page.getByRole("button", { name: /Create Album/i })).toBeVisible();

		// Verify seeded album is visible
		await expect(page.getByText("Sports Day 2026")).toBeVisible();
	});

	test("parent should view published gallery albums", async ({ page }) => {
		// Login as parent
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to gallery page
		await page.getByRole("link", { name: "Gallery" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/gallery/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Photo Gallery/i })).toBeVisible();

		// Should see the published album (Sports Day 2026 is Year 2, matching child1)
		await expect(page.getByText("Sports Day 2026")).toBeVisible();

		// Draft album should NOT be visible to parent
		await expect(page.getByText("Art Exhibition (Draft)")).not.toBeVisible();
	});

	test("staff should send message with attachment button visible", async ({ page }) => {
		// Login as staff
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("claire@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Navigate to compose message page
		await page.goto("http://localhost:3000/dashboard/messages/new");

		// Verify the attachment button is present
		await expect(page.getByTestId("message-attach-button")).toBeVisible();
		await expect(page.getByTestId("message-attach-button")).toHaveText(/Attach File/i);
	});
});
