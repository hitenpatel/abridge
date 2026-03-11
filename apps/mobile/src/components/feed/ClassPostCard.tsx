import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, TouchableOpacity, View } from "react-native";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

const EMOJI_MAP: Record<Emoji, string> = {
	HEART: "\u2764\uFE0F",
	THUMBS_UP: "\uD83D\uDC4D",
	CLAP: "\uD83D\uDC4F",
	LAUGH: "\uD83D\uDE02",
	WOW: "\uD83D\uDE2E",
};

const EMOJI_ORDER: Emoji[] = ["HEART", "THUMBS_UP", "CLAP", "LAUGH", "WOW"];

interface ClassPostCardProps {
	body?: string | null;
	mediaUrls: string[];
	authorName?: string;
	timestamp: Date | string;
	reactionCounts: Partial<Record<Emoji, number>>;
	myReaction: Emoji | null;
	totalReactions: number;
	onReact: (emoji: Emoji) => void;
	onRemoveReaction: () => void;
	onPress?: () => void;
}

function isVideoUrl(url: string): boolean {
	return /\.(mp4|mov|webm)$/i.test(url);
}

function formatDate(ts: Date | string): string {
	const d = typeof ts === "string" ? new Date(ts) : ts;
	return d.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function ImageGrid({ urls }: { urls: string[] }) {
	const images = urls.filter((u) => !isVideoUrl(u));
	if (images.length === 0) return null;

	if (images.length === 1) {
		return (
			<Image
				source={{ uri: images[0] }}
				className="w-full rounded-xl"
				style={{ height: 200 }}
				resizeMode="cover"
			/>
		);
	}

	return (
		<View className="flex-row flex-wrap gap-1 rounded-xl overflow-hidden">
			{images.slice(0, 4).map((url, i) => (
				<View key={url} style={{ width: "49%", height: 120 }}>
					<Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
					{i === 3 && images.length > 4 && (
						<View className="absolute inset-0 bg-black/50 items-center justify-center">
							<Text className="text-white text-lg font-sans-bold">+{images.length - 4}</Text>
						</View>
					)}
				</View>
			))}
		</View>
	);
}

function VideoThumbnail({ url }: { url: string }) {
	return (
		<View className="w-full rounded-xl overflow-hidden bg-gray-200" style={{ height: 180 }}>
			<View className="absolute inset-0 items-center justify-center z-10">
				<View className="w-12 h-12 rounded-full bg-white/90 items-center justify-center">
					<MaterialIcons name="play-arrow" size={24} color="#1a1a1a" />
				</View>
			</View>
		</View>
	);
}

export function ClassPostCard({
	body,
	mediaUrls,
	authorName,
	timestamp,
	reactionCounts,
	myReaction,
	onReact,
	onRemoveReaction,
	onPress,
}: ClassPostCardProps) {
	const videos = mediaUrls.filter(isVideoUrl);

	return (
		<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 gap-3" accessibilityLabel={body ?? undefined}>
			{/* Tappable content area */}
			<TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
				{/* Author row */}
				<View className="flex-row items-center gap-2">
					<View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
						<MaterialIcons name="person" size={16} color="#96867f" />
					</View>
					<View className="flex-1">
						{authorName && (
							<Text className="text-sm font-sans-semibold text-foreground dark:text-white">
								{authorName}
							</Text>
						)}
						<Text className="text-xs font-sans text-text-muted">{formatDate(timestamp)}</Text>
					</View>
					<MaterialIcons name="chevron-right" size={20} color="#96867f" />
				</View>

				{/* Caption */}
				{body && (
					<Text className="text-sm font-sans text-foreground dark:text-white mt-2">{body}</Text>
				)}

				{/* Media */}
				<View className="mt-2">
					<ImageGrid urls={mediaUrls} />
					{videos.map((url) => (
						<VideoThumbnail key={url} url={url} />
					))}
				</View>
			</TouchableOpacity>

			{/* Reaction bar - outside touchable so taps don't conflict */}
			<View className="flex-row items-center gap-1 pt-2 border-t border-gray-100">
				{EMOJI_ORDER.map((emoji) => {
					const count = reactionCounts[emoji] ?? 0;
					const isActive = myReaction === emoji;

					return (
						<Pressable
							key={emoji}
							onPress={() => {
								if (isActive) {
									onRemoveReaction();
								} else {
									onReact(emoji);
								}
							}}
							className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
								isActive ? "bg-primary/10" : ""
							}`}
							style={isActive ? { borderWidth: 1, borderColor: "rgba(245,110,61,0.3)" } : {}}
						>
							<Text className="text-base">{EMOJI_MAP[emoji]}</Text>
							{count > 0 && (
								<Text
									className={`text-xs font-sans-medium ${
										isActive ? "text-primary" : "text-text-muted"
									}`}
								>
									{count}
								</Text>
							)}
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
