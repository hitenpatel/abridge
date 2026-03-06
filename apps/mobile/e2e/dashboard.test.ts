import { by, device, element, expect, waitFor } from "detox";

describe("Dashboard Overview", () => {
	beforeAll(async () => {
		await device.launchApp({
			newInstance: true,
			launchArgs: { detoxEnableSynchronization: 0 },
		});
		await device.setURLBlacklist([".*10\\.0\\.2\\.2.*", ".*localhost.*"]);
		await device.enableSynchronization();
	});

	it("should show the Home screen", async () => {
		await waitFor(element(by.text("Home")))
			.toBeVisible()
			.withTimeout(10000);
	});

	it("should display Overview section", async () => {
		await expect(element(by.text("Overview"))).toBeVisible();
	});

	it("should display Unread Messages", async () => {
		await expect(element(by.text("Unread Messages"))).toBeVisible();
	});

	it("should display Outstanding payments", async () => {
		await expect(element(by.text("Outstanding"))).toBeVisible();
	});

	it("should display My Children section", async () => {
		await expect(element(by.text("My Children"))).toBeVisible();
	});

	it("should display Upcoming Events section", async () => {
		await expect(element(by.text("Upcoming Events"))).toBeVisible();
	});
});
