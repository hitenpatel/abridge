import { by, device, element, expect, waitFor } from "detox";

describe("Messages Flow", () => {
	beforeAll(async () => {
		await device.launchApp({
			newInstance: true,
			launchArgs: { detoxEnableSynchronization: 0 },
		});
		await device.setURLBlacklist([".*10\\.0\\.2\\.2.*", ".*localhost.*"]);
		await device.enableSynchronization();
	});

	it("should navigate to Inbox", async () => {
		await element(by.text("Inbox")).tap();

		await waitFor(element(by.text("Inbox")))
			.toBeVisible()
			.withTimeout(5000);
	});
});
