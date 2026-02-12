import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../lib/theme";

export interface MessageItem {
	id: string;
	subject: string;
	body: string;
	category: string;
	createdAt: Date;
	schoolName: string;
	isRead: boolean;
}

interface MessageCardProps {
	message: MessageItem;
	onPress: () => void;
}

function formatDate(date: Date): string {
	const now = new Date();
	const messageDate = new Date(date);

	// Check if today
	if (
		messageDate.getDate() === now.getDate() &&
		messageDate.getMonth() === now.getMonth() &&
		messageDate.getFullYear() === now.getFullYear()
	) {
		return "Today";
	}

	// Check if yesterday
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (
		messageDate.getDate() === yesterday.getDate() &&
		messageDate.getMonth() === yesterday.getMonth() &&
		messageDate.getFullYear() === yesterday.getFullYear()
	) {
		return "Yesterday";
	}

	// Otherwise, format as "Jan 3"
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	return `${months[messageDate.getMonth()]} ${messageDate.getDate()}`;
}

function truncateBody(body: string, maxLength = 80): string {
	if (body.length <= maxLength) return body;
	return `${body.slice(0, maxLength).trim()}...`;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onPress }) => {
	return (
		<TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
			<View style={styles.header}>
				<View style={styles.titleRow}>
					{!message.isRead && <View style={styles.unreadBadge} />}
					<Text style={[styles.subject, !message.isRead && styles.subjectUnread]} numberOfLines={1}>
						{message.subject}
					</Text>
				</View>
				<Text style={styles.date}>{formatDate(message.createdAt)}</Text>
			</View>

			<Text style={styles.bodyPreview} numberOfLines={2}>
				{truncateBody(message.body)}
			</Text>

			<View style={styles.footer}>
				<Text style={styles.schoolName}>{message.schoolName}</Text>
				<View style={[styles.categoryBadge, getCategoryStyle(message.category)]}>
					<Text style={styles.categoryText}>{message.category}</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
};

function getCategoryStyle(category: string): { backgroundColor: string } {
	switch (category.toLowerCase()) {
		case "urgent":
			return { backgroundColor: theme.colors.absent };
		case "announcement":
			return { backgroundColor: theme.colors.brandLight };
		case "reminder":
			return { backgroundColor: theme.colors.late };
		case "newsletter":
			return { backgroundColor: theme.colors.present };
		default:
			return { backgroundColor: theme.colors.secondary };
	}
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: theme.colors.card,
		borderRadius: 12,
		padding: 16,
		marginHorizontal: 16,
		marginVertical: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		marginRight: 8,
	},
	unreadBadge: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: theme.colors.error,
		marginRight: 8,
	},
	subject: {
		fontSize: 16,
		fontWeight: "500",
		color: theme.colors.text,
		flex: 1,
	},
	subjectUnread: {
		fontWeight: "700",
		color: theme.colors.text,
	},
	date: {
		fontSize: 13,
		color: theme.colors.inactiveTab,
	},
	bodyPreview: {
		fontSize: 14,
		color: theme.colors.textMuted,
		lineHeight: 20,
		marginBottom: 12,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	schoolName: {
		fontSize: 13,
		color: theme.colors.primary,
		fontWeight: "500",
	},
	categoryBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	categoryText: {
		fontSize: 11,
		fontWeight: "600",
		color: theme.colors.text,
		textTransform: "capitalize",
	},
});
