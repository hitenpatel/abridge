import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface MessageCardProps {
	subject: string;
	body: string;
	category: "URGENT" | "STANDARD" | "FYI";
	timestamp: Date | string;
	isRead: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
	URGENT: { bg: "#FEE2E2", text: "#991B1B" },
	STANDARD: { bg: "#F3F4F6", text: "#374151" },
	FYI: { bg: "#DBEAFE", text: "#1E40AF" },
};

export function MessageCard({ subject, body, category, timestamp, isRead }: MessageCardProps) {
	const ts = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
	const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.STANDARD;

	return (
		<View
			className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
			style={!isRead ? { borderWidth: 1, borderColor: "rgba(245,110,61,0.2)" } : {}}
		>
			<View className="flex-row items-start gap-3">
				<View className="w-9 h-9 rounded-lg bg-blue-50 items-center justify-center">
					<MaterialIcons name="mail" size={18} color="#2563EB" />
				</View>
				<View className="flex-1">
					<View className="flex-row items-center gap-2 mb-1">
						{!isRead && <View className="w-2 h-2 rounded-full bg-primary" />}
						<Text
							className={`text-sm flex-1 ${
								isRead
									? "font-sans text-foreground dark:text-white"
									: "font-sans-bold text-foreground dark:text-white"
							}`}
							numberOfLines={1}
						>
							{subject}
						</Text>
					</View>
					<Text className="text-xs font-sans text-text-muted mb-2" numberOfLines={2}>
						{body}
					</Text>
					<View className="flex-row items-center gap-2">
						<View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.bg }}>
							<Text className="text-xs font-sans-semibold" style={{ color: colors.text }}>
								{category}
							</Text>
						</View>
						<Text className="text-xs font-sans text-text-muted">
							{ts.toLocaleDateString("en-GB", {
								day: "numeric",
								month: "short",
								hour: "numeric",
								minute: "2-digit",
							})}
						</Text>
					</View>
				</View>
			</View>
		</View>
	);
}
