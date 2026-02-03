import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "SchoolConnect",
	slug: "schoolconnect",
	version: "1.0.0",
	orientation: "portrait",
	scheme: "schoolconnect",
	platforms: ["ios", "android"],
	ios: {
		bundleIdentifier: "com.schoolconnect.app",
		supportsTablet: true,
	},
	android: {
		package: "com.schoolconnect.app",
		adaptiveIcon: {
			backgroundColor: "#2563eb",
		},
	},
	extra: {
		apiUrl: process.env.API_URL ?? "http://localhost:4000",
	},
});
