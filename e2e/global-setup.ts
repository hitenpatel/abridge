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

	// Navigate to login page (minimal page that won't create auth sessions)
	await page.goto(`${baseURL}/login`);
	await page.evaluate(() => {
		localStorage.setItem("abridge-cookie-consent", "accepted");
		localStorage.setItem("abridge-onboarding-completed", "true");
	});

	// Clear all cookies to prevent stale session cookies from leaking into tests
	await context.clearCookies();

	await context.storageState({ path: "e2e/.auth/storage-state.json" });
	await browser.close();
}

export default globalSetup;
