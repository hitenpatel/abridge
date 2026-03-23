import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: "./apps/api/.env" });

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	timeout: 60000,
	reporter: [["list"], ["json", { outputFile: "playwright-report.json" }]],
	use: {
		baseURL: "http://localhost:3000",
		storageState: "e2e/.auth/storage-state.json",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
