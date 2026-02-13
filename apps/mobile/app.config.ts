import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: "Abridge",
	slug: "abridge",
	version: "1.0.0",
	orientation: "portrait",
	scheme: "abridge",
	platforms: ["ios", "android"],
	ios: {
		bundleIdentifier: "com.abridge.app",
		supportsTablet: true,
	},
	android: {
		package: "com.abridge.app",
		adaptiveIcon: {
			backgroundColor: "#FF7D45",
		},
	},
	extra: {
		apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
	},
});
