import { MaterialIcons } from "@expo/vector-icons";
import { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type PostType = "DISCUSSION" | "EVENT" | "VOLUNTEER_REQUEST";

interface CommunityPost {
	id: string;
	title: string;
	body: string | null;
	type: PostType;
	authorName: string;
	tags: string[];
	createdAt: Date;
}

function formatDate(date: Date): string {
	const now = new Date();
	const postDate = new Date(date);

	if (
		postDate.getDate() === now.getDate() &&
		postDate.getMonth() === now.getMonth() &&
		postDate.getFullYear() === now.getFullYear()
	) {
		return "Today";
	}

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (
		postDate.getDate() === yesterday.getDate() &&
		postDate.getMonth() === yesterday.getMonth() &&
		postDate.getFullYear() === yesterday.getFullYear()
	) {
		return "Yesterday";
	}

	return postDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function getTypeBadge(type: PostType): { bg: string; text: string; label: string } {
	switch (type) {
		case "DISCUSSION":
			return { bg: "#DBEAFE", text: "#2563EB", label: "Discussion" };
		case "EVENT":
			return { bg: "#DCFCE7", text: "#16A34A", label: "Event" };
		case "VOLUNTEER_REQUEST":
			return { bg: "#FED7AA", text: "#EA580C", label: "Volunteer" };
	}
}

function PostCard({ post }: { post: CommunityPost }) {
	const badge = getTypeBadge(post.type);

	return (
		<View
			className="mx-6 mb-3 bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
			style={{
				shadowColor: "#f56e3d",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.08,
				shadowRadius: 24,
				elevation: 4,
			}}
		>
			{/* Type badge + date row */}
			<View className="flex-row items-center justify-between mb-2">
				<View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: badge.bg }}>
					<Text className="text-xs font-sans-semibold" style={{ color: badge.text }}>
						{badge.label}
					</Text>
				</View>
				<Text className="text-xs font-sans text-text-muted">{formatDate(post.createdAt)}</Text>
			</View>

			{/* Title */}
			<Text className="text-base font-sans-bold text-foreground dark:text-white mb-1">
				{post.title}
			</Text>

			{/* Body (truncated) */}
			{post.body ? (
				<Text className="text-sm font-sans text-text-muted mb-3" numberOfLines={2}>
					{post.body}
				</Text>
			) : null}

			{/* Tags */}
			{post.tags.length > 0 && (
				<View className="flex-row flex-wrap gap-1.5 mb-3">
					{post.tags.map((tag) => (
						<View key={tag} className="rounded-full px-2 py-0.5 bg-primary/10">
							<Text className="text-xs font-sans text-primary">{tag}</Text>
						</View>
					))}
				</View>
			)}

			{/* Author row */}
			<View className="flex-row items-center gap-2">
				<View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center">
					<MaterialIcons name="person" size={14} color="#f56e3d" />
				</View>
				<Text className="text-xs font-sans-medium text-text-muted">{post.authorName}</Text>
			</View>
		</View>
	);
}

export function CommunityScreen() {
	const insets = useSafeAreaInsets();

	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId ?? "";

	const { data, isLoading, isError, refetch, isRefetching } = trpc.community.listPosts.useQuery(
		{ schoolId, type: undefined, limit: 20 },
		{ enabled: !!schoolId },
	);

	const posts = (data?.posts as CommunityPost[] | undefined) ?? [];

	const handleRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	const handleNewPost = useCallback(() => {
		// Placeholder: navigate to compose community post screen
	}, []);

	if (isLoading || !schoolId) {
		return (
			<View
				testID="community-screen"
				className="flex-1 bg-background"
				style={{ paddingTop: insets.top }}
			>
				<View className="px-6 pt-6 pb-4">
					<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Community</Text>
				</View>
				<View className="px-6 gap-3">
					<Skeleton className="h-28 rounded-2xl" />
					<Skeleton className="h-28 rounded-2xl" />
					<Skeleton className="h-28 rounded-2xl" />
					<Skeleton className="h-28 rounded-2xl" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-6">
				<MaterialIcons name="error-outline" size={48} color="#F87171" />
				<Text className="text-foreground font-sans-bold text-lg mt-4 mb-2">
					Failed to load community posts
				</Text>
				<Pressable onPress={() => refetch()} className="bg-primary px-6 py-3 rounded-full">
					<Text className="text-white font-sans-bold">Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View testID="community-screen" className="flex-1 bg-background">
			{/* Header */}
			<View className="px-6 pb-4 bg-background" style={{ paddingTop: insets.top + 8 }}>
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Community</Text>
				{posts.length > 0 && (
					<Text className="text-xs text-text-muted font-sans">
						{posts.length} post{posts.length !== 1 ? "s" : ""}
					</Text>
				)}
			</View>

			<ScrollView
				testID="community-list"
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#f56e3d" />
				}
				showsVerticalScrollIndicator={false}
			>
				{posts.length === 0 ? (
					<View className="flex-1 items-center justify-center py-20">
						<MaterialIcons name="groups" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No community posts yet
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1">
							Be the first to start a conversation
						</Text>
					</View>
				) : (
					posts.map((post) => <PostCard key={post.id} post={post} />)
				)}
			</ScrollView>

			{/* New Post FAB */}
			<TouchableOpacity
				testID="new-post-fab"
				onPress={handleNewPost}
				accessibilityLabel="New Post"
				className="absolute bottom-8 right-6 bg-primary rounded-full w-14 h-14 items-center justify-center"
				style={{
					shadowColor: "#f56e3d",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.35,
					shadowRadius: 12,
					elevation: 8,
				}}
			>
				<MaterialIcons name="add" size={28} color="white" />
			</TouchableOpacity>
		</View>
	);
}
