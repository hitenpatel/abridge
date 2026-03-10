import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { useLogout } from "../../App";
import { StatCard } from "../components/StatCard";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function StaffHomeScreen() {
	const navigation = useNavigation<NavigationProp>();
	const insets = useSafeAreaInsets();
	const logout = useLogout();

	const { data: session } = trpc.auth.getSession.useQuery();

	const { data: summary, isLoading, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();
	const schoolId = session?.schoolId ?? "";
	const { data: recentPosts } = trpc.classPost.listRecent.useQuery(
		{ schoolId },
		{ enabled: !!schoolId },
	);

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
				<View className="flex-row items-start justify-between">
					<View className="flex-1">
						<Text className="text-sm font-sans-semibold uppercase tracking-wider text-text-muted mb-1">
							{dateString}
						</Text>
						<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white">
							{greeting}, <Text className="text-primary">{firstName}!</Text>
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<Pressable
							onPress={() => navigation.navigate("Settings")}
							accessibilityLabel="Settings"
							className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center mt-1"
						>
							<MaterialIcons name="settings" size={20} color="#96867f" />
						</Pressable>
						<Pressable
							onPress={logout}
							accessibilityLabel="Log Out"
							className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center mt-1"
						>
							<MaterialIcons name="logout" size={18} color="#96867f" />
						</Pressable>
					</View>
				</View>
			</View>

			{/* Dev-only tab navigation buttons (Maestro can't tap floating tab bar on iOS) */}
			{(__DEV__ || process.env.EXPO_PUBLIC_E2E) && (
				<View className="flex-row flex-wrap gap-2 px-6 pt-2">
					<Pressable testID="nav-messages" onPress={() => navigation.navigate("StaffMessages" as never)} className="bg-neutral-surface rounded-full px-3 py-1">
						<Text className="text-text-muted text-xs">Messages</Text>
					</Pressable>
					<Pressable testID="nav-attendance" onPress={() => navigation.navigate("StaffAttendance" as never)} className="bg-neutral-surface rounded-full px-3 py-1">
						<Text className="text-text-muted text-xs">Attendance</Text>
					</Pressable>
					<Pressable testID="nav-payments" onPress={() => navigation.navigate("StaffPayments" as never)} className="bg-neutral-surface rounded-full px-3 py-1">
						<Text className="text-text-muted text-xs">Payments</Text>
					</Pressable>
					{session?.staffRole === "ADMIN" && (
						<Pressable testID="nav-staff-management" onPress={() => navigation.navigate("StaffManagement")} className="bg-neutral-surface rounded-full px-3 py-1">
							<Text className="text-text-muted text-xs">Staff Mgmt</Text>
						</Pressable>
					)}
				</View>
			)}

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
					onPress={() => navigation.navigate("ComposePost")}
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

				{recentPosts && recentPosts.length > 0 ? (
					recentPosts.map((post) => {
						const postDate = new Date(post.createdAt);
						return (
							<View
								key={post.id}
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
									<View className="bg-primary/10 rounded-full px-2.5 py-0.5">
										<Text className="text-xs font-sans-semibold text-primary">
											{post.yearGroup} - {post.className}
										</Text>
									</View>
									<Text className="text-xs font-sans text-text-muted">
										{postDate.toLocaleDateString("en-GB", {
											day: "numeric",
											month: "short",
											hour: "numeric",
											minute: "2-digit",
										})}
									</Text>
								</View>
								{post.body && (
									<Text
										className="text-base font-sans text-foreground dark:text-white"
										numberOfLines={3}
									>
										{post.body}
									</Text>
								)}
								{!post.body &&
									Array.isArray(post.mediaUrls) &&
									(post.mediaUrls as string[]).length > 0 && (
										<View className="flex-row items-center gap-1">
											<MaterialIcons name="photo" size={16} color="#96867f" />
											<Text className="text-sm font-sans text-text-muted">
												{(post.mediaUrls as string[]).length} photo
												{(post.mediaUrls as string[]).length > 1 ? "s" : ""}
											</Text>
										</View>
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

			{/* New Message CTA */}
			<View className="px-6 mt-4">
				<Pressable
					onPress={() => navigation.navigate("ComposeMessage")}
					accessibilityLabel="New Message"
					className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
				>
					<View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
						<MaterialIcons name="email" size={24} color="#3B82F6" />
					</View>
					<View className="flex-1">
						<Text className="text-base font-sans-bold text-foreground dark:text-white">
							New Message
						</Text>
						<Text className="text-xs font-sans text-text-muted">
							Send update to all parents
						</Text>
					</View>
					<MaterialIcons name="chevron-right" size={24} color="#96867f" />
				</Pressable>
			</View>

			{/* Staff Management (Admin only) */}
			{session?.staffRole === "ADMIN" && (
				<View className="px-6 mt-4">
					<Pressable
						onPress={() => navigation.navigate("StaffManagement")}
						accessibilityLabel="Staff"
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
					>
						<View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center">
							<MaterialIcons name="manage-accounts" size={24} color="#8B5CF6" />
						</View>
						<View className="flex-1">
							<Text className="text-base font-sans-bold text-foreground dark:text-white">
								Staff Management
							</Text>
							<Text className="text-xs font-sans text-text-muted">
								Manage team members and roles
							</Text>
						</View>
						<MaterialIcons name="chevron-right" size={24} color="#96867f" />
					</Pressable>
				</View>
			)}
		</ScrollView>
	);
}
