import type React from "react";
import { Pressable, Text, View } from "react-native";
import { Badge, Body, Card, Muted } from "./ui";

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

function getCategoryVariant(category: string): "default" | "destructive" | "warning" | "success" | "info" {
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
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, onPress }) => {
	return (
		<Pressable onPress={onPress} className="mx-4 my-1.5">
			<Card className="active:opacity-70">
				<View className="flex-row justify-between items-center mb-2">
					<View className="flex-row items-center flex-1 mr-2">
						{!message.isRead && <View className="w-2 h-2 rounded-full bg-primary mr-2" />}
						<Text
							className={`flex-1 text-base font-sans ${
								!message.isRead ? "font-bold text-foreground" : "font-medium text-foreground"
							}`}
							numberOfLines={1}
						>
							{message.subject}
						</Text>
					</View>
					<Muted className="text-xs">{formatDate(message.createdAt)}</Muted>
				</View>

				<Body className="mb-3 leading-5" numberOfLines={2}>
					{truncateBody(message.body)}
				</Body>

				<View className="flex-row justify-between items-center">
					<Body className="text-xs text-primary font-medium">{message.schoolName}</Body>
					<Badge variant={getCategoryVariant(message.category)}>{message.category}</Badge>
				</View>
			</Card>
		</Pressable>
	);
};
