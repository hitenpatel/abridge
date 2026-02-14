import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import type { RootStackParamList } from "../../App";
import { trpc } from "../lib/trpc";

type MessageDetailScreenProps = NativeStackScreenProps<RootStackParamList, "MessageDetail">;

function getCategoryColor(category: string): { bg: string; text: string } {
	switch (category.toLowerCase()) {
		case "urgent":
			return { bg: "#FEE2E2", text: "#DC2626" };
		case "announcement":
			return { bg: "#DBEAFE", text: "#2563EB" };
		case "reminder":
			return { bg: "#FEF3C7", text: "#92400E" };
		case "newsletter":
			return { bg: "#DCFCE7", text: "#16A34A" };
		default:
			return { bg: "#F3F4F6", text: "#6B7280" };
	}
}

const formatFullDate = (date: Date): string => {
	const d = new Date(date);
	return d.toLocaleDateString([], {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export function MessageDetailScreen({ route }: MessageDetailScreenProps) {
	const { message } = route.params;
	const categoryColor = getCategoryColor(message.category);
	const utils = trpc.useUtils();

	const markReadMutation = trpc.messaging.markRead.useMutation({
		onSuccess: () => {
			utils.messaging.listReceived.invalidate();
		},
		onError: (error) => {
			console.warn("Failed to mark message as read:", error.message);
		},
	});

	const markAsRead = useCallback(() => {
		markReadMutation.mutate({ messageId: message.id });
	}, [markReadMutation, message.id]);

	useEffect(() => {
		if (!message.isRead) {
			markAsRead();
		}
	}, [message.isRead, markAsRead]);

	return (
		<ScrollView className="flex-1 bg-background">
			<View className="p-6">
				{/* Coral accent bar */}
				<View className="h-1 w-16 bg-primary rounded-full mb-5" />

				{/* Category badge */}
				<View
					className="self-start rounded-full px-3 py-1 mb-4"
					style={{ backgroundColor: categoryColor.bg }}
				>
					<Text className="text-xs font-sans-semibold" style={{ color: categoryColor.text }}>
						{message.category}
					</Text>
				</View>

				{/* Subject */}
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white leading-8 mb-4">
					{message.subject}
				</Text>

				{/* Meta */}
				<View className="flex-row items-center flex-wrap mb-6">
					<Text className="text-sm font-sans-semibold text-primary">{message.schoolName}</Text>
					<Text className="text-text-muted mx-2">·</Text>
					<Text className="text-sm font-sans text-text-muted">
						{formatFullDate(message.createdAt)}
					</Text>
				</View>

				{/* Divider */}
				<View className="h-px bg-border dark:bg-white/10 mb-6" />

				{/* Body */}
				<Text className="text-base font-sans text-text-main dark:text-gray-200 leading-7">
					{message.body}
				</Text>

				{/* Read status */}
				{message.readAt && (
					<View className="mt-8 pt-4 border-t border-border dark:border-white/10 flex-row items-center justify-center gap-1.5">
						<MaterialIcons name="done_all" size={14} color="#f56e3d" />
						<Text className="text-xs font-sans text-text-muted">
							Read on{" "}
							{new Date(message.readAt).toLocaleDateString([], {
								month: "short",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);
}
