import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { StatCard } from "../components/StatCard";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function StaffHomeScreen() {
	const navigation = useNavigation<NavigationProp>();
	const insets = useSafeAreaInsets();

	const { data: session } = trpc.auth.getSession.useQuery();

	const { data: summary, isLoading, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	const firstName = session?.user?.name?.split(" ")[0] ?? "Teacher";
	const hour = new Date().getHours();
	const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

	const today = new Date();
	const dateString = today.toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

	if (isLoading) {
		return (
			<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
				<View className="px-6 pt-6 gap-4">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-10 w-64" />
					<View className="flex-row gap-3 mt-4">
						<Skeleton className="h-24 flex-1 rounded-2xl" />
						<Skeleton className="h-24 flex-1 rounded-2xl" />
						<Skeleton className="h-24 flex-1 rounded-2xl" />
					</View>
					<Skeleton className="h-32 rounded-3xl mt-4" />
					<Skeleton className="h-40 rounded-3xl" />
				</View>
			</View>
		);
	}

	const unreadMessages = summary?.metrics.unreadMessages ?? 0;
	const attendanceAlerts = summary?.metrics.attendanceAlerts ?? 0;
	const upcomingEventsCount = summary?.upcomingEvents?.length ?? 0;

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 100 }}
			showsVerticalScrollIndicator={false}
			refreshControl={
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
			}
		>
			{/* Header */}
			<View
				className="px-6 pb-6"
				style={{
					paddingTop: insets.top + 8,
					backgroundColor: "rgba(245, 110, 61, 0.06)",
				}}
			>
				<Text className="text-sm font-sans-semibold uppercase tracking-wider text-text-muted mb-1">
					{dateString}
				</Text>
				<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white">
					{greeting}, <Text className="text-primary">{firstName}!</Text>
				</Text>
			</View>

			{/* Quick Stats */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="mt-4"
				contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
			>
				<StatCard
					icon="email"
					value={unreadMessages}
					label="Unread"
					color="#3B82F6"
					bgColor="#DBEAFE"
				/>
				<StatCard
					icon="warning"
					value={attendanceAlerts}
					label="Absent"
					color="#F59E0B"
					bgColor="#FEF3C7"
				/>
				<StatCard
					icon="event"
					value={upcomingEventsCount}
					label="Events"
					color="#8B5CF6"
					bgColor="#EDE9FE"
				/>
			</ScrollView>

			{/* Post Update CTA */}
			<View className="px-6 mt-6">
				<Pressable
					onPress={() => navigation.navigate("ComposeMessage")}
					className="bg-primary rounded-3xl p-6 relative overflow-hidden"
					style={{
						shadowColor: "#f56e3d",
						shadowOffset: { width: 0, height: 8 },
						shadowOpacity: 0.25,
						shadowRadius: 24,
						elevation: 8,
					}}
				>
					{/* Decorative circles */}
					<View className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
					<View className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

					<View className="flex-row items-center justify-between">
						<View className="flex-1">
							<Text className="text-xl font-sans-bold text-white mb-1">Post Update</Text>
							<Text className="text-sm font-sans text-white/80">
								Share news with parents instantly
							</Text>
						</View>
						<View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
							<MaterialIcons name="add" size={28} color="white" />
						</View>
					</View>
				</Pressable>
			</View>

			{/* Recent Posts */}
			<View className="px-6 mt-8">
				<View className="flex-row items-center justify-between mb-4">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted">
						Recent Posts
					</Text>
					<Pressable>
						<Text className="text-sm font-sans-medium text-primary">View All</Text>
					</Pressable>
				</View>

				{summary?.upcomingEvents && summary.upcomingEvents.length > 0 ? (
					summary.upcomingEvents.slice(0, 3).map((event) => {
						const eventDate = new Date(event.startDate);
						return (
							<View
								key={event.id}
								className="bg-neutral-surface dark:bg-surface-dark rounded-3xl p-5 mb-3"
								style={{
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.05,
									shadowRadius: 8,
									elevation: 2,
								}}
							>
								<View className="flex-row items-center gap-2 mb-2">
									<View className="bg-yellow-100 rounded-full px-2.5 py-0.5">
										<Text className="text-xs font-sans-semibold text-yellow-800">
											{event.category.replace("_", " ")}
										</Text>
									</View>
									<Text className="text-xs font-sans text-text-muted">
										{eventDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
									</Text>
								</View>
								<Text className="text-base font-sans-bold text-foreground dark:text-white mb-1">
									{event.title}
								</Text>
								{event.body && (
									<Text className="text-sm font-sans text-text-muted" numberOfLines={2}>
										{event.body}
									</Text>
								)}
							</View>
						);
					})
				) : (
					<View className="items-center py-12">
						<MaterialIcons name="article" size={40} color="#D1D5DB" />
						<Text className="text-text-muted font-sans-medium text-sm mt-3">No recent posts</Text>
					</View>
				)}
			</View>

			{/* Staff Management (Admin only) */}
			{session?.staffRole === "ADMIN" && (
				<View className="px-6 mt-4">
					<Pressable
						onPress={() => navigation.navigate("StaffManagement")}
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
					>
						<View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center">
							<MaterialIcons name="manage_accounts" size={24} color="#8B5CF6" />
						</View>
						<View className="flex-1">
							<Text className="text-base font-sans-bold text-foreground dark:text-white">
								Staff Management
							</Text>
							<Text className="text-xs font-sans text-text-muted">
								Manage team members and roles
							</Text>
						</View>
						<MaterialIcons name="chevron_right" size={24} color="#96867f" />
					</Pressable>
				</View>
			)}
		</ScrollView>
	);
}
