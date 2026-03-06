const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

// Force single React instance: pnpm hoisting creates nested react copies
// in dependencies, causing "Cannot read property 'useState' of null" crashes.
// Override resolution so all react/react-native imports resolve from project root.
const dedupePackages = ["react", "react-native"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
	for (const pkg of dedupePackages) {
		if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
			return context.resolveRequest(
				{ ...context, originModulePath: path.join(projectRoot, "package.json") },
				moduleName,
				platform,
			);
		}
	}
	return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
	input: "./global.css",
});
