import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ParentTabParamList, RootStackParamList } from "../../App";
import { useLogout } from "../../App";
import { ActionItemsRow } from "../components/ActionItemsRow";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { ActivityFeed } from "../components/feed/ActivityFeed";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

type NavigationProp = CompositeNavigationProp<
	BottomTabNavigationProp<ParentTabParamList, "ParentHome">,
	NativeStackNavigationProp<RootStackParamList>
>;

interface ParentHomeScreenProps {
	navigation: NavigationProp;
}

export function ParentHomeScreen({ navigation }: ParentHomeScreenProps) {
	const insets = useSafeAreaInsets();
	const logout = useLogout();
	const utils = trpc.useUtils();

	const {
		data: summaryData,
		isLoading,
		refetch,
		isRefetching,
	} = trpc.dashboard.getSummary.useQuery();

	const children = summaryData?.children ?? [];
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	useEffect(() => {
		if (children.length > 0 && !selectedChildId) {
			setSelectedChildId(children[0].id);
		}
	}, [children, selectedChildId]);

	// Feed query
	const {
		data: feedData,
		isLoading: isFeedLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = trpc.dashboard.getFeed.useInfiniteQuery(
		{ childId: selectedChildId ?? "", limit: 20 },
		{
			enabled: !!selectedChildId,
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		},
	);

	// Action items query
	const { data: actionItems } = trpc.dashboard.getActionItems.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	// Reaction mutations
	const reactMutation = trpc.classPost.react.useMutation({
		onSuccess: () => utils.dashboard.getFeed.invalidate(),
	});

	const removeReactionMutation = trpc.classPost.removeReaction.useMutation({
		onSuccess: () => utils.dashboard.getFeed.invalidate(),
	});

	const handleReact = useCallback(
		(postId: string, emoji: Emoji) => {
			reactMutation.mutate({ postId, emoji });
		},
		[reactMutation],
	);

	const handleRemoveReaction = useCallback(
		(postId: string) => {
			removeReactionMutation.mutate({ postId });
		},
		[removeReactionMutation],
	);

	const onRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	const handleScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
			const paddingToBottom = 200;
			if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
				if (hasNextPage && !isFetchingNextPage) fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage],
	);

	const firstName = children[0]?.firstName ?? "there";

	if (isLoading) {
		return (
			<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
				<View className="px-6 pt-4">
					<Skeleton className="h-4 w-24 mb-2" />
					<Skeleton className="h-8 w-48 mb-6" />
					<Skeleton className="h-10 w-full rounded-full mb-4" />
					<Skeleton className="h-24 w-full rounded-2xl mb-3" />
					<Skeleton className="h-48 w-full rounded-2xl" />
				</View>
			</View>
		);
	}

	const feedItems = feedData?.pages.flatMap((page) => page.items) ?? [];

	const now = new Date();
	const dateStr = now.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

	return (
		<View className="flex-1 bg-background">
			{/* Header */}
			<View className="px-6 pb-4 bg-background" style={{ paddingTop: insets.top + 8 }}>
				<View className="flex-row items-center justify-between">
					<View>
						<Text className="text-sm font-sans-semibold uppercase tracking-wider text-text-muted">
							{dateStr}
						</Text>
						<Text className="text-2xl font-sans-bold text-foreground dark:text-white mt-1">
							Hi, {firstName}!
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<Pressable
							onPress={() => navigation.navigate("Settings")}
							accessibilityLabel="Settings"
							className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
						>
							<MaterialIcons name="settings" size={20} color="#96867f" />
						</Pressable>
						<Pressable
							onPress={logout}
							accessibilityLabel="Log Out"
							className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
						>
							<MaterialIcons name="logout" size={18} color="#96867f" />
						</Pressable>
					</View>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="pb-28"
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
				showsVerticalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={400}
			>
				{/* Child Switcher */}
				{children.length > 1 && (
					<View className="mb-4">
						<ChildSwitcher
							items={children.map((c) => ({
								id: c.id,
								firstName: c.firstName,
								lastName: c.lastName,
								yearGroup: (c as Record<string, unknown>).yearGroup as string | undefined,
								className: (c as Record<string, unknown>).className as string | undefined,
							}))}
							selectedChildId={selectedChildId ?? ""}
							onSelect={setSelectedChildId}
						/>
					</View>
				)}

				{/* Action Items */}
				{actionItems && actionItems.length > 0 && (
					<View className="mb-4">
						<ActionItemsRow
							items={actionItems.map((item) => ({
								type: item.type,
								title: (item as Record<string, unknown>).title as string | undefined,
								subject: (item as Record<string, unknown>).subject as string | undefined,
								amountDuePence: (item as Record<string, unknown>).amountDuePence as
									| number
									| undefined,
								paymentItemId: (item as Record<string, unknown>).paymentItemId as
									| string
									| undefined,
								templateId: (item as Record<string, unknown>).templateId as string | undefined,
								messageId: (item as Record<string, unknown>).messageId as string | undefined,
							}))}
							onPayment={() => navigation.getParent()?.navigate("Payments")}
							onForm={() => navigation.navigate("Forms")}
							onMessage={() => navigation.getParent()?.navigate("Messages")}
						/>
					</View>
				)}

				{/* Activity Feed */}
				<ActivityFeed
					items={feedItems as Parameters<typeof ActivityFeed>[0]["items"]}
					isLoading={isFeedLoading || isFetchingNextPage}
					onReact={handleReact}
					onRemoveReaction={handleRemoveReaction}
					onPayment={() => navigation.getParent()?.navigate("Payments")}
					onPostPress={(postId) => navigation.navigate("PostDetail", { postId })}
				/>
			</ScrollView>

			{/* Report Absence FAB */}
			<Pressable
				onPress={() => navigation.getParent()?.navigate("Attendance")}
				className="absolute right-6 bg-primary rounded-full px-5 py-3 flex-row items-center gap-2"
				style={{
					shadowColor: "#f56e3d",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 12,
					elevation: 8,
					bottom: insets.bottom + 80,
				}}
			>
				<MaterialIcons name="warning" size={16} color="white" />
				<Text className="text-white font-sans-bold text-sm">Report Absence</Text>
			</Pressable>
		</View>
	);
}
