import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import { trpc } from "../lib/trpc";

type MessageDetailScreenProps = NativeStackScreenProps<RootStackParamList, "MessageDetail">;

const getCategoryColor = (category: string): string => {
	switch (category) {
		case "URGENT":
			return theme.colors.absentText;
		case "FYI":
			return theme.colors.primary;
		default:
			return theme.colors.textMuted;
	}
};

const getCategoryBackgroundColor = (category: string): string => {
	switch (category) {
		case "URGENT":
			return theme.colors.absent;
		case "FYI":
			return theme.colors.brandLight;
		default:
			return theme.colors.secondary;
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
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{/* Header section */}
			<View style={styles.header}>
				<View
					style={[
						styles.categoryBadge,
						{ backgroundColor: getCategoryBackgroundColor(message.category) },
					]}
				>
					<Text style={[styles.categoryText, { color: getCategoryColor(message.category) }]}>
						{message.category}
					</Text>
				</View>

				<Text style={styles.subject}>{message.subject}</Text>

				<View style={styles.metaContainer}>
					<Text style={styles.schoolName}>{message.schoolName}</Text>
					<Text style={styles.separator}>-</Text>
					<Text style={styles.date}>{formatFullDate(message.createdAt)}</Text>
				</View>
			</View>

			{/* Divider */}
			<View style={styles.divider} />

			{/* Message body */}
			<View style={styles.bodyContainer}>
				<Text style={styles.body}>{message.body}</Text>
			</View>

			{/* Read status indicator (optional) */}
			{message.readAt && (
				<View style={styles.readStatusContainer}>
					<Text style={styles.readStatusText}>
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
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.card,
	},
	content: {
		padding: 20,
	},
	header: {
		marginBottom: 16,
	},
	categoryBadge: {
		alignSelf: "flex-start",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		marginBottom: 16,
	},
	categoryText: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	subject: {
		fontSize: 24,
		fontWeight: "700",
		color: theme.colors.text,
		lineHeight: 32,
		marginBottom: 12,
	},
	metaContainer: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
	},
	schoolName: {
		fontSize: 14,
		fontWeight: "600",
		color: theme.colors.primary,
	},
	separator: {
		marginHorizontal: 8,
		color: theme.colors.border,
	},
	date: {
		fontSize: 14,
		color: theme.colors.textMuted,
	},
	divider: {
		height: 1,
		backgroundColor: theme.colors.border,
		marginVertical: 20,
	},
	bodyContainer: {
		flex: 1,
	},
	body: {
		fontSize: 16,
		color: theme.colors.text,
		lineHeight: 26,
	},
	readStatusContainer: {
		marginTop: 24,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: theme.colors.secondary,
	},
	readStatusText: {
		fontSize: 12,
		color: theme.colors.inactiveTab,
		textAlign: "center",
	},
});
