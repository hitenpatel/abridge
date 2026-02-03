import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { MessageCard, type MessageItem } from "../components/MessageCard";
import { trpc } from "../lib/trpc";
import type { RootStackParamList, MessageItem as RouteMessageItem } from "../../App";

interface MessagesScreenProps {
	navigation: NativeStackNavigationProp<RootStackParamList, "Messages">;
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
			<View style={styles.footerLoader}>
				<ActivityIndicator size="small" color="#1d4ed8" />
			</View>
		);
	}, [isFetchingNextPage]);

	const renderEmpty = useCallback(() => {
		if (isLoading) return null;
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>No messages yet.</Text>
				<Text style={styles.emptySubtext}>Pull down to refresh</Text>
			</View>
		);
	}, [isLoading]);

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#1d4ed8" />
				<Text style={styles.loadingText}>Loading messages...</Text>
			</View>
		);
	}

	if (isError) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>Failed to load messages</Text>
				<Text style={styles.errorSubtext}>{error?.message}</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={messages}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				contentContainerStyle={styles.listContent}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#1d4ed8" />
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

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9fafb",
	},
	listContent: {
		paddingVertical: 8,
		flexGrow: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f9fafb",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: "#6b7280",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f9fafb",
		padding: 20,
	},
	errorText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#ef4444",
	},
	errorSubtext: {
		marginTop: 8,
		fontSize: 14,
		color: "#6b7280",
		textAlign: "center",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 60,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
	},
	emptySubtext: {
		marginTop: 8,
		fontSize: 14,
		color: "#9ca3af",
	},
	footerLoader: {
		paddingVertical: 20,
		alignItems: "center",
	},
});
