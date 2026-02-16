import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface EventCardProps {
	title: string;
	startDate: Date | string;
	category: string;
	allDay?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
	TERM_DATE: { bg: "#DBEAFE", text: "#1E40AF" },
	INSET_DAY: { bg: "#FEF3C7", text: "#92400E" },
	EVENT: { bg: "#D1FAE5", text: "#065F46" },
	DEADLINE: { bg: "#FEE2E2", text: "#991B1B" },
	CLUB: { bg: "#F3F4F6", text: "#374151" },
};

export function EventCard({ title, startDate, category, allDay }: EventCardProps) {
	const start = typeof startDate === "string" ? new Date(startDate) : startDate;
	const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.EVENT;

	return (
		<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4">
			<View className="flex-row items-start gap-3">
				<View className="w-9 h-9 rounded-lg bg-purple-50 items-center justify-center">
					<MaterialIcons name="event" size={18} color="#7C3AED" />
				</View>
				<View className="flex-1">
					<Text
						className="text-sm font-sans-semibold text-foreground dark:text-white"
						numberOfLines={1}
					>
						{title}
					</Text>
					<View className="flex-row items-center gap-2 mt-1">
						<View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.bg }}>
							<Text className="text-xs font-sans-semibold" style={{ color: colors.text }}>
								{category.replace("_", " ")}
							</Text>
						</View>
						<Text className="text-xs font-sans text-text-muted">
							{start.toLocaleDateString("en-GB", {
								day: "numeric",
								month: "short",
								year: "numeric",
							})}
						</Text>
					</View>
					{!allDay && (
						<View className="flex-row items-center gap-1 mt-1">
							<MaterialIcons name="schedule" size={12} color="#96867f" />
							<Text className="text-xs font-sans text-text-muted">
								{start.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</Text>
						</View>
					)}
				</View>
			</View>
		</View>
	);
}
