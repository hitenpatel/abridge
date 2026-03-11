import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
	NativeStackNavigationProp,
	NativeStackScreenProps,
} from "@react-navigation/native-stack";
import React, { useCallback } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { trpc } from "../lib/trpc";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

const EMOJI_MAP: Record<Emoji, string> = {
	HEART: "\u2764\uFE0F",
	THUMBS_UP: "\uD83D\uDC4D",
	CLAP: "\uD83D\uDC4F",
	LAUGH: "\uD83D\uDE02",
	WOW: "\uD83D\uDE2E",
};

const EMOJI_ORDER: Emoji[] = ["HEART", "THUMBS_UP", "CLAP", "LAUGH", "WOW"];

function formatDate(ts: Date | string): string {
	const d = typeof ts === "string" ? new Date(ts) : ts;
	return d.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function isVideoUrl(url: string): boolean {
	return /\.(mp4|mov|webm)$/i.test(url);
}

export function PostDetailScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const route = useRoute<NativeStackScreenProps<RootStackParamList, "PostDetail">["route"]>();
	const insets = useSafeAreaInsets();
	const utils = trpc.useUtils();

	const { postId } = route.params;

	const { data: post, isLoading } = trpc.classPost.getById.useQuery({ postId });

	const reactMutation = trpc.classPost.react.useMutation({
		onSuccess: () => {
			utils.classPost.getById.invalidate({ postId });
			utils.dashboard.getFeed.invalidate();
		},
	});

	const removeReactionMutation = trpc.classPost.removeReaction.useMutation({
		onSuccess: () => {
			utils.classPost.getById.invalidate({ postId });
			utils.dashboard.getFeed.invalidate();
		},
	});

	const handleReact = useCallback(
		(emoji: Emoji) => {
			reactMutation.mutate({ postId, emoji });
		},
		[reactMutation, postId],
	);

	const handleRemoveReaction = useCallback(() => {
		removeReactionMutation.mutate({ postId });
	}, [removeReactionMutation, postId]);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	if (!post) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<Text className="text-text-muted font-sans">Post not found</Text>
			</View>
		);
	}

	const images = post.mediaUrls.filter((u) => !isVideoUrl(u));
	const videos = post.mediaUrls.filter(isVideoUrl);
	const myReaction = post.myReaction as Emoji | null;
	const reactionCounts = post.reactionCounts as Partial<Record<Emoji, number>>;

	return (
		<View testID="post-detail-content" className="flex-1 bg-background">
			{/* Header */}
			<View
				className="flex-row items-center gap-3 px-6 pb-4 border-b border-gray-100"
				style={{ paddingTop: insets.top + 8 }}
			>
				<Pressable onPress={() => navigation.goBack()}>
					<MaterialIcons name="arrow-back" size={24} color="#1a1a1a" />
				</Pressable>
				<Text className="text-lg font-sans-bold text-foreground dark:text-white flex-1">
					Class Post
				</Text>
				<Text className="text-xs font-sans text-text-muted">
					{post.yearGroup} {post.className}
				</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding: 24, gap: 16 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Author row */}
				<View className="flex-row items-center gap-3">
					<View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
						<MaterialIcons name="person" size={20} color="#96867f" />
					</View>
					<View>
						<Text className="text-base font-sans-semibold text-foreground dark:text-white">
							{post.authorName}
						</Text>
						<Text className="text-xs font-sans text-text-muted">{formatDate(post.createdAt)}</Text>
					</View>
				</View>

				{/* Body */}
				{post.body && (
					<Text className="text-base font-sans text-foreground dark:text-white leading-6">
						{post.body}
					</Text>
				)}

				{/* Images - full width */}
				{images.map((url) => (
					<Image
						key={url}
						source={{ uri: url }}
						className="w-full rounded-xl"
						style={{ height: 250 }}
						resizeMode="cover"
					/>
				))}

				{/* Videos */}
				{videos.map((url) => (
					<View
						key={url}
						className="w-full rounded-xl overflow-hidden bg-gray-200"
						style={{ height: 200 }}
					>
						<View className="absolute inset-0 items-center justify-center z-10">
							<View className="w-14 h-14 rounded-full bg-white/90 items-center justify-center">
								<MaterialIcons name="play-arrow" size={28} color="#1a1a1a" />
							</View>
						</View>
					</View>
				))}

				{/* Reaction bar */}
				<View className="flex-row items-center gap-1.5 pt-4 border-t border-gray-100">
					{EMOJI_ORDER.map((emoji) => {
						const count = reactionCounts[emoji] ?? 0;
						const isActive = myReaction === emoji;

						return (
							<Pressable
								key={emoji}
								onPress={() => {
									if (isActive) {
										handleRemoveReaction();
									} else {
										handleReact(emoji);
									}
								}}
								className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
									isActive ? "bg-primary/10" : ""
								}`}
								style={isActive ? { borderWidth: 1, borderColor: "rgba(245,110,61,0.3)" } : {}}
							>
								<Text className="text-lg">{EMOJI_MAP[emoji]}</Text>
								{count > 0 && (
									<Text
										className={`text-sm font-sans-medium ${
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
			</ScrollView>
		</View>
	);
}
