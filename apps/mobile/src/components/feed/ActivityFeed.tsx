import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AttendanceCard } from "./AttendanceCard";
import { ClassPostCard } from "./ClassPostCard";
import { EventCard } from "./EventCard";
import { MessageCard } from "./MessageCard";
import { PaymentCard } from "./PaymentCard";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

interface FeedCard {
	type: "classPost" | "message" | "attendance" | "payment" | "event";
	timestamp: Date | string;
	id: string;
	data: Record<string, unknown>;
}

interface ActivityFeedProps {
	items: FeedCard[];
	isLoading?: boolean;
	onReact?: (postId: string, emoji: Emoji) => void;
	onRemoveReaction?: (postId: string) => void;
	onPayment?: () => void;
	onPostPress?: (postId: string) => void;
}

function renderCard(
	card: FeedCard,
	onReact?: (postId: string, emoji: Emoji) => void,
	onRemoveReaction?: (postId: string) => void,
	onPayment?: () => void,
	onPostPress?: (postId: string) => void,
) {
	switch (card.type) {
		case "classPost":
			return (
				<ClassPostCard
					body={card.data.body as string | null | undefined}
					mediaUrls={(card.data.mediaUrls as string[]) ?? []}
					authorName={card.data.authorName as string | undefined}
					timestamp={card.timestamp}
					reactionCounts={(card.data.reactionCounts as Partial<Record<Emoji, number>>) ?? {}}
					myReaction={(card.data.myReaction as Emoji | null) ?? null}
					totalReactions={(card.data.totalReactions as number) ?? 0}
					onReact={(emoji) => onReact?.(card.id, emoji)}
					onRemoveReaction={() => onRemoveReaction?.(card.id)}
					onPress={() => onPostPress?.(card.id)}
				/>
			);
		case "message":
			return (
				<MessageCard
					subject={card.data.subject as string}
					body={card.data.body as string}
					category={card.data.category as "URGENT" | "STANDARD" | "FYI"}
					timestamp={card.timestamp}
					isRead={(card.data.isRead as boolean) ?? false}
				/>
			);
		case "attendance":
			return (
				<AttendanceCard
					childName={card.data.childName as string}
					date={card.data.date as Date | string}
					session={card.data.session as "AM" | "PM"}
					mark={
						card.data.mark as
							| "PRESENT"
							| "LATE"
							| "ABSENT_AUTHORISED"
							| "ABSENT_UNAUTHORISED"
							| "NOT_REQUIRED"
					}
					note={card.data.note as string | null | undefined}
				/>
			);
		case "payment":
			return (
				<PaymentCard
					title={card.data.title as string}
					amountDuePence={card.data.amountDuePence as number}
					dueDate={card.data.dueDate as Date | string | null | undefined}
					category={card.data.category as string}
					onPay={onPayment}
				/>
			);
		case "event":
			return (
				<EventCard
					title={card.data.title as string}
					startDate={card.data.startDate as Date | string}
					category={card.data.category as string}
					allDay={card.data.allDay as boolean | undefined}
				/>
			);
		default:
			return null;
	}
}

export function ActivityFeed({
	items,
	isLoading,
	onReact,
	onRemoveReaction,
	onPayment,
	onPostPress,
}: ActivityFeedProps) {
	if (isLoading && items.length === 0) {
		return (
			<View className="items-center py-12">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	if (!isLoading && items.length === 0) {
		return (
			<View className="items-center py-12">
				<Text className="text-sm font-sans text-text-muted">No activity yet</Text>
			</View>
		);
	}

	return (
		<View>
			{items.map((item) => (
				<View key={`${item.type}-${item.id}`} className="px-6 mb-3">
					{renderCard(item, onReact, onRemoveReaction, onPayment, onPostPress)}
				</View>
			))}
			{isLoading && items.length > 0 && (
				<View className="py-4 items-center">
					<ActivityIndicator size="small" color="#f56e3d" />
				</View>
			)}
		</View>
	);
}
