import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/__tests__/**", "src/**/*.d.ts"],
			thresholds: {
				lines: 45,
				functions: 45,
				branches: 35,
			},
		},
	},
});
