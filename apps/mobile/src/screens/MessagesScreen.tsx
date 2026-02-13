import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Mail } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import type { RootStackParamList, MessageItem as RouteMessageItem, TabParamList } from "../../App";
import { MessageCard, type MessageItem } from "../components/MessageCard";
import { Body, EmptyState, Muted, Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface MessagesScreenProps {
	navigation: CompositeNavigationProp<
		BottomTabNavigationProp<TabParamList, "Messages">,
		NativeStackNavigationProp<RootStackParamList>
	>;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
	const {
		data,
		isLoading,
		isError,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		refetch,
		isRefetching,
	} = trpc.messaging.listReceived.useInfiniteQuery(
		{ limit: 20 },
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		},
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
		(message: MessageItem) => {
			navigation.navigate("MessageDetail", {
				message: {
					...message,
					schoolLogo: null,
				} as RouteMessageItem,
			});
		},
		[navigation],
	);

	const renderItem = useCallback(
		({ item }: { item: MessageItem }) => (
			<MessageCard message={item} onPress={() => handleMessagePress(item)} />
		),
		[handleMessagePress],
	);

	const renderFooter = useCallback(() => {
		if (!isFetchingNextPage) return null;
		return (
			<View className="py-5 items-center">
				<ActivityIndicator size="small" color="#FF7D45" />
			</View>
		);
	}, [isFetchingNextPage]);

	const renderEmpty = useCallback(() => {
		if (isLoading) return null;
		return (
			<EmptyState
				icon={<Mail size={48} color="#9CA3AF" />}
				title="No messages yet"
				description="Pull down to refresh"
			/>
		);
	}, [isLoading]);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-4 gap-3">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background justify-center items-center px-5">
				<Body className="text-lg font-semibold text-destructive">Failed to load messages</Body>
				<Muted className="mt-2 text-center">{error?.message}</Muted>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<FlatList
				data={messages}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				className="flex-1"
				contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#FF7D45" />
				}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.3}
				ListFooterComponent={renderFooter}
				ListEmptyComponent={renderEmpty}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
};
