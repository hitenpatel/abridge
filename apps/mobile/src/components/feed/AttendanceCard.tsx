import React from "react";
import { Text, View } from "react-native";

interface AttendanceCardProps {
	childName: string;
	date: Date | string;
	session: "AM" | "PM";
	mark: "PRESENT" | "LATE" | "ABSENT_AUTHORISED" | "ABSENT_UNAUTHORISED" | "NOT_REQUIRED";
	note?: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
	PRESENT: { color: "#22C55E", label: "Present" },
	LATE: { color: "#EAB308", label: "Late" },
	ABSENT_AUTHORISED: { color: "#F87171", label: "Absent (Auth)" },
	ABSENT_UNAUTHORISED: { color: "#DC2626", label: "Absent (Unauth)" },
	NOT_REQUIRED: { color: "#9CA3AF", label: "Not Required" },
};

export function AttendanceCard({ childName, date, session, mark, note }: AttendanceCardProps) {
	const d = typeof date === "string" ? new Date(date) : date;
	const config = STATUS_CONFIG[mark] ?? STATUS_CONFIG.PRESENT;

	return (
		<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4">
			<View className="flex-row items-center gap-3">
				<View className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
				<View className="flex-1">
					<View className="flex-row items-center justify-between">
						<Text
							className="text-sm font-sans-semibold text-foreground dark:text-white"
							numberOfLines={1}
						>
							{childName}
						</Text>
						<Text className="text-xs font-sans text-text-muted">{session}</Text>
					</View>
					<View className="flex-row items-center gap-2 mt-0.5">
						<Text className="text-xs font-sans text-text-muted">
							{d.toLocaleDateString("en-GB", {
								day: "numeric",
								month: "short",
								year: "numeric",
							})}
						</Text>
						<Text className="text-xs font-sans-medium text-foreground dark:text-white">
							{config.label}
						</Text>
					</View>
					{note && (
						<Text className="text-xs font-sans text-text-muted mt-1" numberOfLines={1}>
							{note}
						</Text>
					)}
				</View>
			</View>
		</View>
	);
}
