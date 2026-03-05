import { by, device, element, expect, waitFor } from "detox";

describe("Messages Flow", () => {
	beforeAll(async () => {
		await device.launchApp({
			launchArgs: { detoxURLBlacklistRegex: '(".*10\\.0\\.2\\.2.*",".*localhost.*")' },
		});
	});

	it("should navigate to Inbox", async () => {
		await element(by.text("Inbox")).tap();

		await waitFor(element(by.text("Inbox")))
			.toBeVisible()
			.withTimeout(5000);
	});
});
