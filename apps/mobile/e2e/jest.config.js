/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
	rootDir: "..",
	testMatch: ["<rootDir>/e2e/**/*.test.ts"],
	testTimeout: 120000,
	maxWorkers: 1,
	globalSetup: "detox/runners/jest/globalSetup",
	globalTeardown: "detox/runners/jest/globalTeardown",
	reporters: ["detox/runners/jest/reporter"],
	testEnvironment: "detox/runners/jest/testEnvironment",
	transform: {
		"\\.[jt]sx?$": [
			"babel-jest",
			{
				configFile: false,
				presets: [
					["babel-preset-expo", { jsxImportSource: "nativewind", reanimated: false }],
					"nativewind/babel",
				],
				plugins: ["react-native-reanimated/plugin"],
			},
		],
	},
	verbose: true,
};
