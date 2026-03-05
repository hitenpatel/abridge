import { by, device, element, expect } from "detox";

describe("Tab Navigation Smoke Test", () => {
	beforeAll(async () => {
		await device.launchApp();
		await device.setURLBlacklist([".*10\\.0\\.2\\.2.*", ".*localhost.*"]);
	});

	it("should start on Home", async () => {
		await expect(element(by.text("Home"))).toBeVisible();
	});

	it("should navigate to Inbox", async () => {
		await element(by.text("Inbox")).tap();
		await expect(element(by.text("Inbox"))).toBeVisible();
	});

	it("should navigate to Calendar", async () => {
		await element(by.text("Calendar")).tap();
		await expect(element(by.text("Calendar"))).toBeVisible();
	});

	it("should navigate to Attendance", async () => {
		await element(by.text("Attendance")).tap();
		await expect(element(by.text("Attendance"))).toBeVisible();
	});

	it("should navigate to Payments", async () => {
		await element(by.text("Payments")).tap();
		await expect(element(by.text("Payments"))).toBeVisible();
	});

	it("should navigate back to Home", async () => {
		await element(by.text("Home")).tap();
		await expect(element(by.text("Overview"))).toBeVisible();
	});
});
