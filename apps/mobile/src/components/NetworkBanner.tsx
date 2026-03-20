import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export function NetworkBanner() {
	const [isOnline, setIsOnline] = useState(true);

	useEffect(() => {
		// Subscribe to React Query's online status
		const unsubscribe = onlineManager.subscribe((online) => {
			setIsOnline(online);
		});

		// Also check connectivity via a lightweight fetch
		const checkConnectivity = async () => {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 5000);
				await fetch("https://clients3.google.com/generate_204", {
					method: "HEAD",
					signal: controller.signal,
				});
				clearTimeout(timeout);
				onlineManager.setOnline(true);
			} catch {
				onlineManager.setOnline(false);
			}
		};

		// Check every 15 seconds when offline
		const interval = setInterval(() => {
			if (!onlineManager.isOnline()) {
				checkConnectivity();
			}
		}, 15000);

		return () => {
			unsubscribe();
			clearInterval(interval);
		};
	}, []);

	if (isOnline) return null;

	return (
		<View className="bg-destructive px-4 py-2" testID="offline-banner" accessibilityRole="alert">
			<Text className="text-white text-center text-sm font-medium">
				You're offline. Some features may be unavailable.
			</Text>
		</View>
	);
}
