"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useRef } from "react";
import { AttendanceCard } from "./attendance-card";
import { ClassPostCard } from "./class-post-card";
import { EventCard } from "./event-card";
import { MessageCard } from "./message-card";
import { PaymentCard } from "./payment-card";
import { ReactionBar } from "./reaction-bar";

// Feed card types matching the API response from dashboard.getFeed
type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

interface ClassPostData {
	body?: string | null;
	mediaUrls: string[];
	authorId: string;
	authorName?: string;
	reactionCounts: Partial<Record<Emoji, number>>;
	totalReactions: number;
	myReaction: Emoji | null;
}

interface MessageData {
	subject: string;
	body: string;
	category: "URGENT" | "STANDARD" | "FYI";
	authorId?: string | null;
	isRead: boolean;
}

interface AttendanceData {
	childName: string;
	date: Date | string;
	session: "AM" | "PM";
	mark: "PRESENT" | "LATE" | "ABSENT_AUTHORISED" | "ABSENT_UNAUTHORISED" | "NOT_REQUIRED";
	note?: string | null;
}

interface PaymentData {
	title: string;
	amountDuePence: number;
	dueDate?: Date | string | null;
	category: "DINNER_MONEY" | "TRIP" | "CLUB" | "UNIFORM" | "OTHER";
}

interface EventData {
	title: string;
	startDate: Date | string;
	endDate?: Date | string | null;
	category: "TERM_DATE" | "INSET_DAY" | "EVENT" | "DEADLINE" | "CLUB";
	allDay?: boolean;
}

type FeedCard =
	| { type: "classPost"; timestamp: Date | string; id: string; data: ClassPostData }
	| { type: "message"; timestamp: Date | string; id: string; data: MessageData }
	| { type: "attendance"; timestamp: Date | string; id: string; data: AttendanceData }
	| { type: "payment"; timestamp: Date | string; id: string; data: PaymentData }
	| { type: "event"; timestamp: Date | string; id: string; data: EventData };

interface ActivityFeedProps {
	items: FeedCard[];
	isLoading?: boolean;
	hasMore?: boolean;
	onLoadMore?: () => void;
	onReact?: (postId: string, emoji: Emoji) => void;
	onRemoveReaction?: (postId: string) => void;
	onPostPress?: (postId: string) => void;
	currentUserId?: string;
	isStaff?: boolean;
	schoolId?: string;
}

function FeedSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className="rounded-2xl border bg-card p-4 space-y-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-full" />
						<div className="space-y-1">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-2 w-16" />
						</div>
					</div>
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-40 w-full rounded-xl" />
				</div>
			))}
		</div>
	);
}

function renderCard(
	card: FeedCard,
	onReact?: (postId: string, emoji: Emoji) => void,
	onRemoveReaction?: (postId: string) => void,
	onPostPress?: (postId: string) => void,
	currentUserId?: string,
	isStaff?: boolean,
	schoolId?: string,
) {
	switch (card.type) {
		case "classPost": {
			const d = card.data as ClassPostData;
			return (
				<ClassPostCard
					key={card.id}
					postId={card.id}
					authorId={d.authorId}
					currentUserId={currentUserId}
					isStaff={isStaff}
					schoolId={schoolId}
					body={d.body}
					mediaUrls={d.mediaUrls}
					authorName={d.authorName}
					timestamp={card.timestamp}
					onPress={() => onPostPress?.(card.id)}
				>
					<ReactionBar
						reactionCounts={d.reactionCounts}
						myReaction={d.myReaction}
						onReact={(emoji) => onReact?.(card.id, emoji)}
						onRemoveReaction={() => onRemoveReaction?.(card.id)}
					/>
				</ClassPostCard>
			);
		}
		case "message": {
			const d = card.data as MessageData;
			return (
				<MessageCard
					key={card.id}
					subject={d.subject}
					body={d.body}
					category={d.category}
					timestamp={card.timestamp}
					isRead={d.isRead}
				/>
			);
		}
		case "attendance": {
			const d = card.data as AttendanceData;
			return (
				<AttendanceCard
					key={card.id}
					childName={d.childName}
					date={d.date}
					session={d.session}
					mark={d.mark}
					note={d.note}
				/>
			);
		}
		case "payment": {
			const d = card.data as PaymentData;
			return (
				<PaymentCard
					key={card.id}
					title={d.title}
					amountDuePence={d.amountDuePence}
					dueDate={d.dueDate}
					category={d.category}
				/>
			);
		}
		case "event": {
			const d = card.data as EventData;
			return (
				<EventCard
					key={card.id}
					title={d.title}
					startDate={d.startDate}
					category={d.category}
					allDay={d.allDay}
				/>
			);
		}
		default:
			return null;
	}
}

export function ActivityFeed({
	items,
	isLoading,
	hasMore,
	onLoadMore,
	onReact,
	onRemoveReaction,
	onPostPress,
	currentUserId,
	isStaff,
	schoolId,
}: ActivityFeedProps) {
	const sentinelRef = useRef<HTMLDivElement>(null);

	const handleIntersect = useCallback(
		(entries: IntersectionObserverEntry[]) => {
			const [entry] = entries;
			if (entry?.isIntersecting && hasMore && !isLoading) {
				onLoadMore?.();
			}
		},
		[hasMore, isLoading, onLoadMore],
	);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(handleIntersect, {
			rootMargin: "200px",
		});
		observer.observe(sentinel);

		return () => observer.disconnect();
	}, [handleIntersect]);

	if (isLoading && items.length === 0) {
		return <FeedSkeleton />;
	}

	if (!isLoading && items.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p className="text-sm">No activity yet</p>
			</div>
		);
	}

	return (
		<div className="space-y-4" data-testid="activity-feed">
			{items.map((card) =>
				renderCard(card, onReact, onRemoveReaction, onPostPress, currentUserId, isStaff, schoolId),
			)}

			{/* Infinite scroll sentinel */}
			<div ref={sentinelRef} className="h-px" />

			{isLoading && items.length > 0 && (
				<div className="flex justify-center py-4">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			)}
		</div>
	);
}
