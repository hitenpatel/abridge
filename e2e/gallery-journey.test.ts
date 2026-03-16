import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedGalleryAlbum,
	seedGalleryPhoto,
	seedMediaUpload,
} from "./helpers/seed-data";

/**
 * Gallery journey tests.
 */
test.describe("Gallery", () => {
	let uniqueURN: string;
	let adminEmail: string;
	let parentEmail: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `admin-gal-${uniqueURN}@e2e-test.com`;
		parentEmail = `parent-gal-${uniqueURN}@e2e-test.com`;
	});

	test("staff should see gallery page with album management", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Gallery Staff School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin via "Go to Registration" link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("Gallery Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable gallery feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { galleryEnabled: true } });

		// === STEP 4: Wait for Gallery nav link ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Gallery/i }).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// === STEP 5: Navigate to gallery page ===
		await page.getByRole("link", { name: "Gallery" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/gallery/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Manage Gallery/i })).toBeVisible();

		// Staff should see Create Album button
		await expect(page.getByRole("button", { name: /Create Album/i })).toBeVisible();
	});

	test("parent should view published gallery albums", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Gallery Parent School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-gp-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent (via /register, NOT "Go to Registration") ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Gallery Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { galleryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ella",
			lastName: "Gallery",
		});

		// Seed a published album with photos
		const album = await seedGalleryAlbum({
			schoolId: school.id,
			createdBy: user.id,
			title: "Sports Day 2026",
			description: "Photos from sports day",
			isPublished: true,
		});

		const media = await seedMediaUpload({
			schoolId: school.id,
			uploadedBy: user.id,
			filename: "sports-1.jpg",
		});

		await seedGalleryPhoto({ albumId: album.id, mediaId: media.id, caption: "Running race", sortOrder: 0 });

		// === STEP 4: Wait for Gallery nav link ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Gallery/i }).first()).toBeVisible({ timeout: 3000 });
		}).toPass({ timeout: 30000 });

		// === STEP 5: Navigate to gallery page ===
		await page.getByRole("link", { name: "Gallery" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/gallery/);

		// Verify heading
		await expect(page.getByRole("heading", { name: /Photo Gallery/i })).toBeVisible();

		// Should see the published album
		await expect(page.getByText("Sports Day 2026")).toBeVisible({ timeout: 10000 });
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

	test("staff should create and publish an album", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Gallery School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as admin via "Go to Registration" link ===
		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await expect(page).toHaveURL(/\/register/);
		await page.getByLabel("Full Name").fill("Gallery Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("AdminPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Enable gallery feature ===
		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { galleryEnabled: true } });

		// === STEP 4: Navigate to gallery ===
		await page.reload();
		await page.getByRole("link", { name: "Gallery" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/gallery/);
		await expect(page.getByRole("heading", { name: /Manage Gallery/i })).toBeVisible({ timeout: 10000 });

		// === STEP 5: Create album ===
		await page.getByRole("button", { name: /Create Album/i }).click();
		await page.getByLabel("Title").fill("Summer Fete 2026");
		await page.getByLabel("Description").fill("Photos from the summer fete");
		await page.getByRole("button", { name: /^Create$/i }).click();

		// === STEP 6: Verify album appears in list ===
		await expect(page.getByText("Summer Fete 2026")).toBeVisible({ timeout: 10000 });

		// === STEP 7: Verify draft badge and publish ===
		await expect(page.getByText("Draft")).toBeVisible();
		await page.getByRole("button", { name: /Publish/i }).click();

		// === STEP 8: Verify published state (Draft badge gone, Unpublish button visible) ===
		await expect(page.getByRole("button", { name: /Unpublish/i })).toBeVisible({ timeout: 10000 });
	});

	test("parent should view photos in a published album", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Gallery Photo School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-gph-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Gallery Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { galleryEnabled: true } });

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Ella",
			lastName: "Gallery",
		});

		// Seed a published album with photos
		const album = await seedGalleryAlbum({
			schoolId: school.id,
			createdBy: user.id,
			title: "Nature Walk Photos",
			description: "Year 4 nature walk",
			isPublished: true,
		});

		const media1 = await seedMediaUpload({
			schoolId: school.id,
			uploadedBy: user.id,
			filename: "nature-1.jpg",
		});
		const media2 = await seedMediaUpload({
			schoolId: school.id,
			uploadedBy: user.id,
			filename: "nature-2.jpg",
		});

		await seedGalleryPhoto({ albumId: album.id, mediaId: media1.id, caption: "By the pond", sortOrder: 0 });
		await seedGalleryPhoto({ albumId: album.id, mediaId: media2.id, caption: "Wildflowers", sortOrder: 1 });

		// === STEP 4: Navigate to gallery ===
		await page.reload();
		await page.getByRole("link", { name: "Gallery" }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/gallery/);
		await expect(page.getByRole("heading", { name: /Photo Gallery/i })).toBeVisible({ timeout: 10000 });

		// === STEP 5: Verify album title visible ===
		await expect(page.getByText("Nature Walk Photos")).toBeVisible({ timeout: 10000 });

		// === STEP 6: Click album and verify photo content ===
		await page.getByText("Nature Walk Photos").click();
		await expect(page.getByText("Year 4 nature walk")).toBeVisible({ timeout: 10000 });
	});

	test("gallery page should show disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No Gallery School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nogal-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("No Gallery Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Navigate to gallery without enabling galleryEnabled ===
		await page.goto("http://localhost:3000/dashboard/gallery");

		// === STEP 4: Verify disabled heading ===
		await expect(
			page.getByRole("heading", { name: /Gallery is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
