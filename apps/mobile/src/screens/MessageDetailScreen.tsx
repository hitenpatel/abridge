import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect } from "react";
import { ScrollView, View } from "react-native";
import type { RootStackParamList } from "../../App";
import { Badge, Body, H1, Muted, Separator } from "../components/ui";
import { trpc } from "../lib/trpc";

type MessageDetailScreenProps = NativeStackScreenProps<RootStackParamList, "MessageDetail">;

const getCategoryVariant = (category: string): "default" | "destructive" | "warning" | "success" | "info" => {
	switch (category.toLowerCase()) {
		case "urgent":
			return "destructive";
		case "announcement":
			return "info";
		case "reminder":
			return "warning";
		case "newsletter":
			return "success";
		default:
			return "default";
	}
};

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

export const MessageDetailScreen = ({ route }: MessageDetailScreenProps) => {
	const { message } = route.params;

	const utils = trpc.useUtils();

	const markReadMutation = trpc.messaging.markRead.useMutation({
		onSuccess: () => {
			// Invalidate the inbox list to update read status
			utils.messaging.listReceived.invalidate();
		},
		onError: (error) => {
			// Log error but don't block UI - read receipt is not critical
			console.warn("Failed to mark message as read:", error.message);
		},
	});

	const markAsRead = useCallback(() => {
		markReadMutation.mutate({ messageId: message.id });
	}, [markReadMutation, message.id]);

	// Mark as read on mount
	useEffect(() => {
		// Only mark as read if not already read
		if (!message.isRead) {
			markAsRead();
		}
	}, [message.isRead, markAsRead]);

	return (
		<ScrollView className="flex-1 bg-card">
			<View className="p-5">
				{/* Coral accent bar */}
				<View className="h-1 w-16 bg-primary rounded-full mb-4" />

				{/* Header section */}
				<View className="mb-4">
					<Badge variant={getCategoryVariant(message.category)} className="mb-4">
						{message.category}
					</Badge>

					<H1 className="mb-3 leading-8">{message.subject}</H1>

					<View className="flex-row items-center flex-wrap">
						<Body className="text-sm font-semibold text-primary">{message.schoolName}</Body>
						<Muted className="mx-2">-</Muted>
						<Muted className="text-sm">{formatFullDate(message.createdAt)}</Muted>
					</View>
				</View>

				{/* Divider */}
				<Separator className="my-5" />

				{/* Message body */}
				<Body className="text-base leading-7">{message.body}</Body>

				{/* Read status indicator */}
				{message.readAt && (
					<View className="mt-6 pt-4 border-t border-secondary">
						<Muted className="text-xs text-center">
							Read on{" "}
							{new Date(message.readAt).toLocaleDateString([], {
								month: "short",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</Muted>
					</View>
				)}
			</View>
		</ScrollView>
	);
};
