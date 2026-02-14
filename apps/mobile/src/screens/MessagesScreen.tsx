import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MessageItem, RootStackParamList } from "../../App";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface MessageItemData {
	id: string;
	subject: string;
	body: string;
	category: string;
	createdAt: Date;
	schoolName: string;
	isRead: boolean;
}

function formatDate(date: Date): string {
	const now = new Date();
	const messageDate = new Date(date);

	if (
		messageDate.getDate() === now.getDate() &&
		messageDate.getMonth() === now.getMonth() &&
		messageDate.getFullYear() === now.getFullYear()
	) {
		return "Today";
	}

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (
		messageDate.getDate() === yesterday.getDate() &&
		messageDate.getMonth() === yesterday.getMonth() &&
		messageDate.getFullYear() === yesterday.getFullYear()
	) {
		return "Yesterday";
	}

	return messageDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

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

function MessageRow({
	message,
	onPress,
}: { message: MessageItemData; onPress: () => void }) {
	const categoryColor = getCategoryColor(message.category);

	return (
		<Pressable
			onPress={onPress}
			className="mx-6 mb-3 bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
			style={{
				shadowColor: "#f56e3d",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.08,
				shadowRadius: 24,
				elevation: 4,
			}}
		>
			<View className="flex-row gap-3">
				{/* School Avatar */}
				<View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center flex-shrink-0">
					<Text className="text-primary font-sans-bold text-lg">
						{message.schoolName[0]?.toUpperCase()}
					</Text>
				</View>

				{/* Content */}
				<View className="flex-1">
					<View className="flex-row items-center justify-between mb-1">
						<View className="flex-row items-center flex-1 mr-2">
							{!message.isRead && (
								<View className="w-2 h-2 rounded-full bg-primary mr-2" />
							)}
							<Text
								className={`flex-1 text-base ${!message.isRead ? "font-sans-bold text-foreground dark:text-white" : "font-sans-medium text-text-main dark:text-gray-200"}`}
								numberOfLines={1}
							>
								{message.subject}
							</Text>
						</View>
						<Text className="text-xs font-sans text-text-muted">{formatDate(message.createdAt)}</Text>
					</View>

					<Text
						className="text-sm font-sans text-text-muted dark:text-gray-400 mb-2"
						numberOfLines={1}
					>
						{message.body}
					</Text>

					<View className="flex-row items-center justify-between">
						<Text className="text-xs font-sans-medium text-primary">
							{message.schoolName}
						</Text>
						<View
							className="rounded-full px-2.5 py-0.5"
							style={{ backgroundColor: categoryColor.bg }}
						>
							<Text className="text-xs font-sans-semibold" style={{ color: categoryColor.text }}>
								{message.category}
							</Text>
						</View>
					</View>
				</View>
			</View>
		</Pressable>
	);
}

export function MessagesScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const insets = useSafeAreaInsets();

	const {
		data,
		isLoading,
		isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		refetch,
		isRefetching,
	} = trpc.messaging.listReceived.useInfiniteQuery(
		{ limit: 20 },
		{ getNextPageParam: (lastPage) => lastPage.nextCursor },
	);

	const messages = data?.pages.flatMap((page) => page.items) ?? [];

	const handleRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	const handleLoadMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleMessagePress = useCallback(
		(message: MessageItemData) => {
			navigation.navigate("MessageDetail", {
				message: { ...message, schoolLogo: null } as MessageItem,
			});
		},
		[navigation],
	);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
				<View className="px-6 pt-6 pb-4">
					<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Inbox</Text>
				</View>
				<View className="px-6 gap-3">
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-6">
				<MaterialIcons name="error_outline" size={48} color="#F87171" />
				<Text className="text-foreground font-sans-bold text-lg mt-4 mb-2">
					Failed to load messages
				</Text>
				<Pressable onPress={() => refetch()} className="bg-primary px-6 py-3 rounded-full">
					<Text className="text-white font-sans-bold">Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<View className="px-6 pb-4 bg-background" style={{ paddingTop: insets.top + 8 }}>
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Inbox</Text>
			</View>

			<FlatList
				data={messages}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<MessageRow message={item} onPress={() => handleMessagePress(item)} />
				)}
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#f56e3d" />
				}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.3}
				ListFooterComponent={
					isFetchingNextPage ? (
						<View className="py-5 items-center">
							<ActivityIndicator size="small" color="#f56e3d" />
						</View>
					) : null
				}
				ListEmptyComponent={
					<View className="flex-1 items-center justify-center py-20">
						<MaterialIcons name="chat_bubble_outline" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No messages yet
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1">
							Pull down to refresh
						</Text>
					</View>
				}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}
