import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedCommunityPost,
	seedVolunteerPost,
} from "./helpers/seed-data";

/**
 * Community Hub E2E Journey
 * Tests: creating discussion posts, commenting, volunteer sign-up,
 * feature disabled state, and seeded post visibility.
 */
test.describe("Community Hub", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-community-${uniqueURN}@e2e-test.com`;
	});

	test("parent should create a discussion post", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Community School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-ch-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Community Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { communityHubEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Taylor",
		});

		// === STEP 4: Navigate to community hub ===
		await page.reload();
		await page
			.getByRole("link", { name: /Community/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/community/);

		// === STEP 5: Create a new discussion post ===
		await page.getByRole("button", { name: /New Post/i }).click();
		await page.getByLabel(/Title/i).fill("School Fair Ideas");
		await page
			.getByLabel(/Body|Content|Message/i)
			.fill("What does everyone think about having a bouncy castle at the school fair?");
		await page.getByRole("button", { name: /Submit|Post|Create|Publish/i }).click();

		// === STEP 6: Verify post appears in feed ===
		await expect(page.getByText("School Fair Ideas")).toBeVisible({ timeout: 10000 });
	});

	test("parent should add a comment to a post", async ({ page }) => {
		// === STEP 1: Setup school + register ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Comment School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-comment-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Comment Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with a community post ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { communityHubEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Oliver",
			lastName: "Brown",
		});

		await seedCommunityPost({
			schoolId: school.id,
			authorId: user.id,
			title: "Playground Improvement Ideas",
			body: "Let's discuss what improvements we'd like to see on the playground.",
		});

		// === STEP 3: Navigate to community and click on the post ===
		await page.reload();
		await page
			.getByRole("link", { name: /Community/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/community/);

		await page.getByText("Playground Improvement Ideas").click();

		// === STEP 4: Add a comment ===
		await page
			.getByPlaceholder(/comment|reply|write/i)
			.fill("I think a new climbing frame would be great!");
		await page.getByRole("button", { name: /Comment|Reply|Send|Submit/i }).click();

		// === STEP 5: Verify comment is visible ===
		await expect(page.getByText("I think a new climbing frame would be great!")).toBeVisible({
			timeout: 10000,
		});
	});

	test("parent should sign up for a volunteer slot", async ({ page }) => {
		// === STEP 1: Setup school + register ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Volunteer School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-vol-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Volunteer Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with a volunteer post ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { communityHubEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Emily",
			lastName: "Clark",
		});

		await seedVolunteerPost({
			schoolId: school.id,
			authorId: user.id,
			title: "School Fair Setup Help",
			spotsTotal: 4,
		});

		// === STEP 3: Navigate to community and click on the volunteer post ===
		await page.reload();
		await page
			.getByRole("link", { name: /Community/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/community/);

		await page.getByText("School Fair Setup Help").click();

		// === STEP 4: Sign up for the volunteer slot ===
		await page.getByRole("button", { name: /Sign Up/i }).click();

		// === STEP 5: Verify signup confirmed ===
		await expect(page.getByText(/signed up|confirmed|registered/i)).toBeVisible({ timeout: 10000 });
	});

	test("community page shows disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup school WITHOUT enabling communityHubEnabled ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Community ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nocomm-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Community Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed child but DON'T enable communityHubEnabled
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 2: Navigate directly to community ===
		await page.goto("http://localhost:3000/dashboard/community");

		// === STEP 3: Should show disabled message ===
		await expect(page.getByText(/disabled|not available|not enabled/i)).toBeVisible({
			timeout: 10000,
		});
	});

	test("feed shows seeded post content", async ({ page }) => {
		// === STEP 1: Setup school + register ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Feed School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-feed-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Feed Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed data with a specific post ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { communityHubEnabled: true } });

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Jack",
			lastName: "Smith",
		});

		await seedCommunityPost({
			schoolId: school.id,
			authorId: user.id,
			title: "E2E Test Discussion Title",
			body: "This is seeded content for verifying the community feed.",
		});

		// === STEP 3: Navigate to community ===
		await page.reload();
		await page
			.getByRole("link", { name: /Community/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/community/);

		// === STEP 4: Verify the seeded post title appears ===
		await expect(page.getByText("E2E Test Discussion Title")).toBeVisible({ timeout: 10000 });
	});
});
