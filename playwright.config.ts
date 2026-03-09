import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: "./apps/api/.env" });

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	timeout: 60000,
	reporter: [["list"], ["json", { outputFile: "playwright-report.json" }]],
	use: {
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
