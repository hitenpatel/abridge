import { by, device, element, expect, waitFor } from "detox";

describe("Login Flow", () => {
	beforeAll(async () => {
		await device.launchApp({
			delete: true,
			newInstance: true,
			launchArgs: { detoxEnableSynchronization: 0 },
		});
		await device.setURLBlacklist([".*10\\.0\\.2\\.2.*", ".*localhost.*"]);
		await device.enableSynchronization();
	});

	it("should show the app title", async () => {
		await expect(element(by.text("SchoolConnect"))).toBeVisible();
	});

	it("should log in with valid credentials", async () => {
		await element(by.text("Email")).tap();
		await element(by.text("Email")).typeText("parent@test.com");

		await element(by.text("Password")).tap();
		await element(by.text("Password")).typeText("password123");

		await element(by.text("Login")).tap();

		await waitFor(element(by.text("Home")))
			.toBeVisible()
			.withTimeout(10000);
	});
});
