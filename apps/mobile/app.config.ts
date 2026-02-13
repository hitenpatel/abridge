import type { ConfigContext, ExpoConfig } from "expo/config";
import os from "node:os";

function getLocalIp(): string {
	for (const interfaces of Object.values(os.networkInterfaces())) {
		for (const iface of interfaces ?? []) {
			if (iface.family === "IPv4" && !iface.internal) {
				return iface.address;
			}
		}
	}
	return "localhost";
}

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
		apiUrl: process.env.EXPO_PUBLIC_API_URL ?? `http://${getLocalIp()}:4000`,
	},
});
