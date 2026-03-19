import { expect, test } from "@playwright/test";

/**
 * Class Posts journey tests.
 * Tests the compose page (staff) and post detail page (staff + parent).
 */
test.describe("Class Posts", () => {
	test("staff: compose page renders heading and form elements", async ({ page }) => {
		// === STEP 1: Login as seeded teacher ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("marcus@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Navigate to compose page ===
		await page.goto("http://localhost:3000/dashboard/compose");

		// === STEP 3: Verify page heading ===
		await expect(page.getByRole("heading", { name: /Post to Class/i })).toBeVisible({
			timeout: 10000,
		});

		// === STEP 4: Verify compose form card is present ===
		await expect(page.getByTestId("compose-post-form")).toBeVisible({ timeout: 10000 });

		// === STEP 5: Verify class selector (combobox) is present ===
		await expect(page.getByRole("combobox")).toBeVisible({ timeout: 10000 });

		// === STEP 6: Verify body textarea is present ===
		await expect(page.getByTestId("post-body-input")).toBeVisible({ timeout: 10000 });

		// === STEP 7: Verify submit button is present ===
		await expect(page.getByTestId("submit-post-button")).toBeVisible({ timeout: 10000 });
	});

	test("staff: compose page has class selector and body text area as required form fields", async ({
		page,
	}) => {
		// === STEP 1: Login as seeded teacher ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("marcus@oakwood.sch.uk");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Navigate to compose page ===
		await page.goto("http://localhost:3000/dashboard/compose");
		await expect(page.getByTestId("compose-post-form")).toBeVisible({ timeout: 10000 });

		// === STEP 3: Class selector must be present and show placeholder ===
		await expect(page.getByRole("combobox")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Select a class")).toBeVisible({ timeout: 10000 });

		// === STEP 4: Body textarea is present and accepts input ===
		const bodyInput = page.getByTestId("post-body-input");
		await expect(bodyInput).toBeVisible({ timeout: 10000 });
		await bodyInput.fill("Test caption text");
		await expect(bodyInput).toHaveValue("Test caption text");

		// === STEP 5: Submit button remains disabled when no class is selected ===
		await expect(page.getByTestId("submit-post-button")).toBeDisabled();
	});

	test("parent: cannot access compose page — sees access denied message", async ({ page }) => {
		// === STEP 1: Login as seeded parent ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Navigate directly to compose page ===
		await page.goto("http://localhost:3000/dashboard/compose");

		// === STEP 3: Verify access denied message is shown (compose is staff-only) ===
		await expect(page.getByText(/Only staff members can compose posts/i)).toBeVisible({
			timeout: 10000,
		});

		// === STEP 4: The compose form must not be accessible ===
		await expect(page.getByTestId("compose-post-form")).not.toBeVisible();
	});

	test("parent: dashboard feed section is present and shows class posts when available", async ({
		page,
	}) => {
		// === STEP 1: Login as seeded parent ===
		// The seed data includes a child in class 2B linked to sarah@example.com
		// and class posts for Year 2 / 2B — so posts should appear in feed.
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Dashboard should be visible ===
		await expect(page.getByTestId("dashboard-view")).toBeVisible({ timeout: 10000 });

		// === STEP 3: Activity feed section is present ===
		// The feed renders class post cards; if posts exist the feed container is visible.
		// If no child is linked yet the empty-dashboard state is shown instead —
		// in either case the page must render without an error.
		const feedOrEmpty = page.getByTestId("activity-feed").or(page.getByTestId("empty-dashboard"));
		await expect(feedOrEmpty.first()).toBeVisible({ timeout: 10000 });

		// === STEP 4: If the activity feed is present, expect at least one class post card ===
		const feedVisible = await page.getByTestId("activity-feed").isVisible();
		if (feedVisible) {
			await expect(page.getByTestId("class-post-card").first()).toBeVisible({ timeout: 10000 });
		}
	});

	test("post detail: reaction bar buttons are visible on a seeded class post", async ({ page }) => {
		// === STEP 1: Login as seeded parent ===
		await page.goto("http://localhost:3000/login");
		await page.getByLabel("Email").fill("sarah@example.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await page.waitForURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Wait for the activity feed to appear ===
		await expect(page.getByTestId("activity-feed")).toBeVisible({ timeout: 10000 });

		// === STEP 3: Click the first class post card to open the detail page ===
		await page.getByTestId("class-post-card").first().click();
		await page.waitForURL(/\/dashboard\/posts\//, { timeout: 10000 });

		// === STEP 4: Verify the post detail wrapper is visible ===
		await expect(page.getByTestId("post-detail")).toBeVisible({ timeout: 10000 });

		// === STEP 5: Verify the reaction bar buttons are present ===
		// ReactionBar renders one button per emoji: HEART, THUMBS_UP, CLAP, LAUGH, WOW
		await expect(page.getByTestId("reaction-HEART")).toBeVisible({ timeout: 10000 });
		await expect(page.getByTestId("reaction-THUMBS_UP")).toBeVisible({ timeout: 10000 });
		await expect(page.getByTestId("reaction-CLAP")).toBeVisible({ timeout: 10000 });
		await expect(page.getByTestId("reaction-LAUGH")).toBeVisible({ timeout: 10000 });
		await expect(page.getByTestId("reaction-WOW")).toBeVisible({ timeout: 10000 });
	});
});
