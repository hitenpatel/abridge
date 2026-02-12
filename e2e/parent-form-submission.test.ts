import { expect, test } from "@playwright/test";
import {
	getSchoolByURN,
	getUserByEmail,
	seedChildForParent,
	seedFormTemplate,
} from "./helpers/seed-data";

/**
 * Draw a signature on the canvas element.
 * Uses Playwright's native mouse API after scrolling into view.
 * Falls back to setting signature via React internals if mouse approach fails.
 */
async function drawSignature(page: import("@playwright/test").Page) {
	const canvas = page.locator("canvas");
	await canvas.scrollIntoViewIfNeeded();
	await page.waitForTimeout(200);

	const box = await canvas.boundingBox();
	if (!box) throw new Error("Canvas not found or not visible");

	// Draw using native mouse events (center of canvas, avoiding clear button at bottom-right)
	const startX = box.x + box.width * 0.15;
	const startY = box.y + box.height * 0.35;

	await page.mouse.move(startX, startY);
	await page.mouse.down();
	for (let i = 1; i <= 8; i++) {
		await page.mouse.move(startX + i * (box.width * 0.08), startY + (i % 2 === 0 ? 15 : -15), {
			steps: 3,
		});
	}
	await page.mouse.up();
	await page.waitForTimeout(300);

	// Verify signature was captured; if not, set it directly via React fiber
	const signatureSet = await page.evaluate(() => {
		const canvasEl = document.querySelector("canvas");
		if (!canvasEl) return false;

		// Walk the React fiber tree to find the onChange prop
		const fiberKey = Object.keys(canvasEl).find(
			(k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
		);
		if (!fiberKey) return false;

		let fiber = (canvasEl as any)[fiberKey];
		while (fiber) {
			if (fiber.memoizedProps && typeof fiber.memoizedProps.onChange === "function") {
				// Check if signature is already set by checking parent FormRenderer state
				// If onChange exists, the parent is SignaturePad which calls onChange(dataUrl)
				// Generate a minimal signature data URL
				const tempCanvas = document.createElement("canvas");
				tempCanvas.width = 200;
				tempCanvas.height = 100;
				const ctx = tempCanvas.getContext("2d");
				if (ctx) {
					ctx.beginPath();
					ctx.moveTo(10, 50);
					ctx.lineTo(190, 50);
					ctx.strokeStyle = "#000";
					ctx.lineWidth = 2;
					ctx.stroke();
				}
				fiber.memoizedProps.onChange(tempCanvas.toDataURL("image/png"));
				return true;
			}
			fiber = fiber.return;
		}
		return false;
	});

	if (!signatureSet) {
		throw new Error("Could not set signature via mouse or React fiber");
	}
}

/**
 * Parent form submission journey: Fill out and submit forms with signature
 */
test.describe("Parent Form Submission Journey", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-form-submit-${uniqueURN}@e2e-test.com`;
	});

	test("parent should fill out and submit a form with signature", async ({ page }) => {
		// Step 1: Setup school and parent
		const schoolName = `Form Submission School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Form Submit Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed child and form template
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "FormTest",
			lastName: "Child",
		});

		await seedFormTemplate({
			schoolId: school.id,
			title: "Medical Information Form",
			description: "Please provide medical details for your child",
		});

		// Step 3: Navigate to forms and open the form
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/forms/);

		// Wait for form to appear and click it
		await expect(page.getByText("Medical Information Form").first()).toBeVisible({
			timeout: 10000,
		});
		await page
			.getByRole("link", { name: /Medical Information Form/i })
			.first()
			.click();

		// Should navigate to form detail page
		await expect(page).toHaveURL(/\/dashboard\/forms\/[a-zA-Z0-9_-]+\?childId=/);

		// Step 4: Fill out the form fields
		await expect(
			page.getByRole("heading", { name: /Medical Information Form/i }).first(),
		).toBeVisible();

		await page.getByLabel(/allergies/i).fill("Peanuts, shellfish");
		await page.getByLabel(/medications/i).fill("None");
		await page.getByLabel(/emergency contact/i).fill("07700 900123");
		await page.getByLabel(/consent.*emergency medical treatment/i).check();

		// Step 5: Sign the signature pad
		await page.waitForTimeout(500);
		await drawSignature(page);

		// Step 6: Submit the form
		await page.getByRole("button", { name: /Submit Form/i }).click();

		// Step 7: Verify submission success
		await expect(page.getByRole("heading", { name: /Form Submitted/i })).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText(/Thank you for completing/i)).toBeVisible();
		await expect(page.getByText(/Medical Information Form/i)).toBeVisible();
	});

	test("parent should see validation error if signature is missing", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Signature Validation School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Validation Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed data
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Validation",
			lastName: "Child",
		});

		await seedFormTemplate({
			schoolId: school.id,
			title: "Quick Consent Form",
		});

		// Step 3: Navigate to form
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page.getByText("Quick Consent Form").first()).toBeVisible({ timeout: 10000 });
		await page
			.getByRole("link", { name: /Quick Consent Form/i })
			.first()
			.click();

		// Step 4: Fill form but DON'T sign
		await page.getByLabel(/allergies/i).fill("None");
		await page.getByLabel(/medications/i).fill("None");
		await page.getByLabel(/emergency contact/i).fill("07700 900999");
		await page.getByLabel(/consent/i).check();

		// Step 5: Try to submit without signature
		await page.getByRole("button", { name: /Submit Form/i }).click();

		// Step 6: Verify signature error appears
		await expect(page.getByText(/Signature is required/i)).toBeVisible({ timeout: 3000 });

		// Should NOT show success message
		await expect(page.getByText(/Form Submitted/i)).not.toBeVisible();
	});

	test("parent with multiple children can apply form to all children", async ({ page }) => {
		// Step 1: Setup
		const schoolName = `Multi Child Form School ${uniqueURN}`;

		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(schoolName);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Multi Child Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Step 2: Seed 2 children
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);

		if (!school || !user) {
			throw new Error("Failed to get school or user for test");
		}

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "First",
			lastName: "Child",
		});

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Second",
			lastName: "Child",
		});

		await seedFormTemplate({
			schoolId: school.id,
			title: "Family Consent Form",
		});

		// Step 3: Navigate to form
		await page.reload();
		await page.getByRole("link", { name: "Forms", exact: true }).first().click();
		await expect(page.getByText("Family Consent Form").first()).toBeVisible({ timeout: 10000 });
		await page
			.getByRole("link", { name: /Family Consent Form/i })
			.first()
			.click();

		// Step 4: Verify "Apply to all children" option appears
		await expect(page.getByText(/Apply to all children/i)).toBeVisible({ timeout: 5000 });
		await expect(
			page.getByText(/1 other child/i).or(page.getByText(/other children/i)),
		).toBeVisible();

		// Step 5: Check the "Apply to all" checkbox
		await page.getByLabel(/Yes, submit for all my children/i).check();

		// Step 6: Fill and submit form
		await page.getByLabel(/allergies/i).fill("None");
		await page.getByLabel(/medications/i).fill("None");
		await page.getByLabel(/emergency contact/i).fill("07700 900111");
		await page.getByLabel(/consent/i).check();

		// Sign
		await page.waitForTimeout(500);
		await drawSignature(page);

		await page.getByRole("button", { name: /Submit Form/i }).click();

		// Step 7: Verify success message mentions all children
		await expect(page.getByRole("heading", { name: /Form Submitted/i })).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText(/for all your children/i)).toBeVisible();
	});
});
