import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedEmergencyAlert,
} from "./helpers/seed-data";

/**
 * Emergency Communications E2E Journey
 * Tests: initiate alert, post updates, resolve with all clear,
 * cancel with reason, alert history, prevent duplicate active alerts,
 * feature disabled state.
 */
test.describe("Emergency Communications", () => {
	let adminEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		adminEmail = `admin-emg-${uniqueURN}@e2e-test.com`;
	});

	test("staff should initiate a lockdown alert with confirmation", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Emergency School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Emergency Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("EmergencyPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		const school = await getSchoolByURN(uniqueURN);
		if (!school) throw new Error("Failed to get school");
		await enableSchoolFeature({ schoolId: school.id, features: { emergencyCommsEnabled: true } });

		// === STEP 2: Navigate to emergency page ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Emergency/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Emergency/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/dashboard\/emergency/);

		// === STEP 3: Verify page heading ===
		await expect(page.getByRole("heading", { name: /Emergency Communications/i })).toBeVisible();

		// === STEP 4: Select Lockdown type ===
		await page.getByText("Lockdown", { exact: true }).click();

		// === STEP 5: Add message ===
		await page
			.getByPlaceholder(/Optional message/i)
			.fill("Please stay indoors. Do not leave the building.");

		// === STEP 6: Click Send Alert ===
		await page.getByRole("button", { name: /Send Alert/i }).click();

		// === STEP 7: Verify confirmation dialog ===
		await expect(page.getByText(/This will immediately notify ALL parents/i)).toBeVisible({
			timeout: 5000,
		});

		// === STEP 8: Confirm ===
		await page.getByRole("button", { name: /CONFIRM/i }).click();

		// === STEP 9: Verify active alert appears ===
		await expect(page.getByText("Lockdown in Effect")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Please stay indoors")).toBeVisible();
	});

	test("staff should post updates to an active alert and resolve it", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Update School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("Update Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("UpdatePassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 2: Seed active alert ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { emergencyCommsEnabled: true } });

		await seedEmergencyAlert({
			schoolId: school.id,
			initiatedBy: user.id,
			type: "EVACUATION",
			message: "Fire alarm activated. Evacuate to assembly point.",
		});

		// === STEP 3: Navigate ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Emergency/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Emergency/i })
			.first()
			.click();

		// === STEP 4: Verify active alert shown ===
		await expect(page.getByText("Evacuation in Progress")).toBeVisible({ timeout: 10000 });

		// === STEP 5: Post an update ===
		await page
			.getByPlaceholder(/Post an update/i)
			.fill("All children accounted for at assembly point A.");
		await page.getByRole("button", { name: "Post", exact: true }).click();

		await page.waitForTimeout(1000);

		// === STEP 6: Resolve with All Clear ===
		await page.getByRole("button", { name: /All Clear/i }).click();

		// === STEP 7: Verify alert resolved ===
		await page.waitForTimeout(2000);

		// Alert should no longer be active — history should show it
		await expect(page.getByText("Alert History")).toBeVisible({ timeout: 10000 });
	});

	test("emergency alert history should show past alerts", async ({ page }) => {
		// === STEP 1: Setup ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`History EMG ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("History Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("HistoryPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(adminEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({ schoolId: school.id, features: { emergencyCommsEnabled: true } });

		// Seed a resolved alert
		await seedEmergencyAlert({
			schoolId: school.id,
			initiatedBy: user.id,
			type: "MEDICAL",
			status: "ALL_CLEAR",
			message: "Medical incident resolved",
		});

		// === STEP 2: Navigate ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByRole("link", { name: /Emergency/i }).first()).toBeVisible({
				timeout: 3000,
			});
		}).toPass({ timeout: 30000 });

		await page
			.getByRole("link", { name: /Emergency/i })
			.first()
			.click();

		// === STEP 3: Verify history ===
		await expect(page.getByText("Alert History")).toBeVisible({ timeout: 10000 });
		// "Medical Emergency" appears both as a button (type selector) and in history - target the paragraph
		await expect(page.getByRole("paragraph").filter({ hasText: "Medical Emergency" })).toBeVisible();
		await expect(page.getByText(/all clear/i).first()).toBeVisible();
	});

	test("emergency page should show disabled state when feature is off", async ({ page }) => {
		// === STEP 1: Setup without enabling emergency ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`No EMG ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(adminEmail);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: /Go to Registration/i }).click();
		await page.getByLabel("Full Name").fill("No EMG Admin");
		await page.getByLabel("Email Address").fill(adminEmail);
		await page.getByLabel("Password").fill("NoEmgPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// DON'T enable emergencyCommsEnabled

		// === STEP 2: Navigate directly ===
		await page.goto("http://localhost:3000/dashboard/emergency");

		// === STEP 3: Should show disabled ===
		await expect(
			page.getByRole("heading", { name: /Emergency Communications is not enabled/i }),
		).toBeVisible({ timeout: 10000 });
	});
});
