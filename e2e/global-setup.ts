import { type FullConfig, chromium } from "@playwright/test";

/**
 * Global setup: dismiss the cookie consent banner by pre-setting localStorage.
 * Saves the browser storage state so all tests start with consent already given.
 */
async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";
	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();

	await page.goto(baseURL);
	await page.evaluate(() => {
		localStorage.setItem("abridge-cookie-consent", "accepted");
	});

	await context.storageState({ path: "e2e/.auth/storage-state.json" });
	await browser.close();
}

export default globalSetup;
