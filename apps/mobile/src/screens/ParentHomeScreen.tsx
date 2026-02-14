import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ParentTabParamList, RootStackParamList } from "../../App";
import { useLogout } from "../../App";
import { AchievementBadge } from "../components/AchievementBadge";
import { HeroCard } from "../components/HeroCard";
import { ProgressBar } from "../components/ProgressBar";
import { TimelineCard } from "../components/TimelineCard";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type NavigationProp = CompositeNavigationProp<
	BottomTabNavigationProp<ParentTabParamList, "ParentHome">,
	NativeStackNavigationProp<RootStackParamList>
>;

interface ParentHomeScreenProps {
	navigation: NavigationProp;
}

const quickActions = [
	{
		icon: "calendar_today" as const,
		label: "Calendar",
		color: "#3B82F6",
		bg: "#DBEAFE",
		route: "Calendar" as const,
	},
	{
		icon: "assignment" as const,
		label: "Forms",
		color: "#8B5CF6",
		bg: "#EDE9FE",
		route: "Forms" as const,
	},
	{
		icon: "sick" as const,
		label: "Sick Note",
		color: "#EF4444",
		bg: "#FEE2E2",
		route: "Attendance" as const,
	},
	{
		icon: "emoji_events" as const,
		label: "Awards",
		color: "#F59E0B",
		bg: "#FEF3C7",
		route: "StudentProfile" as const,
	},
];

export function ParentHomeScreen({ navigation }: ParentHomeScreenProps) {
	const insets = useSafeAreaInsets();
	const logout = useLogout();
	const { data, isLoading, isError, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	const firstName = data?.children?.[0]?.firstName ?? "there";

	if (isLoading) {
		return (
			<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
				<View className="px-6 pt-4">
					<Skeleton className="h-4 w-24 mb-2" />
					<Skeleton className="h-8 w-48 mb-6" />
					<Skeleton className="h-28 w-full rounded-2xl mb-6" />
					<View className="flex-row gap-3 mb-6">
						<Skeleton className="flex-1 h-20 rounded-xl" />
						<Skeleton className="flex-1 h-20 rounded-xl" />
					</View>
					<Skeleton className="h-24 w-full rounded-2xl mb-3" />
					<Skeleton className="h-24 w-full rounded-2xl" />
				</View>
			</View>
		);
	}

	if (isError || !data) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-6">
				<MaterialIcons name="error_outline" size={48} color="#F87171" />
				<Text className="text-foreground font-sans-bold text-lg mt-4 mb-2">Failed to load</Text>
				<Pressable onPress={() => refetch()} className="bg-primary px-6 py-3 rounded-full">
					<Text className="text-white font-sans-bold">Retry</Text>
				</Pressable>
			</View>
		);
	}

	const { children, metrics, todayAttendance, upcomingEvents, attendancePercentage } = data;
	const firstChild = children[0];
	const firstChildAttendance = todayAttendance?.find((a) => a.childId === firstChild?.id);
	const firstChildPercentage =
		attendancePercentage?.find((p) => p.childId === firstChild?.id)?.percentage ?? 0;

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
							onPress={logout}
							className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
						>
							<MaterialIcons name="logout" size={18} color="#96867f" />
						</Pressable>
						<Pressable
							onPress={() => {
								if (firstChild) navigation.navigate("StudentProfile", { childId: firstChild.id });
							}}
							className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center"
						>
							<Text className="text-primary font-sans-bold text-lg">
								{firstName[0]?.toUpperCase()}
							</Text>
							<View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-background" />
						</Pressable>
					</View>
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pb-28"
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
				showsVerticalScrollIndicator={false}
			>
				{/* Hero Card */}
				{firstChild && (
					<Pressable
						onPress={() => navigation.navigate("StudentProfile", { childId: firstChild.id })}
						className="mb-6"
					>
						<HeroCard
							childName={firstChild.firstName}
							status={firstChildAttendance?.mark === "PRESENT" ? "at School" : "Home"}
							checkInTime={firstChildAttendance?.mark === "PRESENT" ? "8:45 AM" : undefined}
						/>
					</Pressable>
				)}

				{/* Quick Actions */}
				<View className="flex-row flex-wrap gap-3 mb-6">
					{quickActions.map((action) => (
						<Pressable
							key={action.label}
							onPress={() => {
								if (action.route === "StudentProfile" && firstChild) {
									navigation.navigate("StudentProfile", { childId: firstChild.id });
								} else if (action.route === "Attendance") {
									navigation.getParent()?.navigate("Attendance");
								} else {
									navigation.navigate(action.route);
								}
							}}
							className="flex-1 min-w-[45%] bg-neutral-surface dark:bg-surface-dark rounded-xl p-4 items-center gap-2"
							style={{
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.02,
								shadowRadius: 4,
								elevation: 1,
							}}
						>
							<View
								className="w-10 h-10 rounded-full items-center justify-center"
								style={{ backgroundColor: action.bg }}
							>
								<MaterialIcons name={action.icon} size={20} color={action.color} />
							</View>
							<Text className="text-sm font-sans-semibold text-foreground dark:text-white">
								{action.label}
							</Text>
						</Pressable>
					))}
				</View>

				{/* Today & Upcoming */}
				<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
					Today & Upcoming
				</Text>
				<View className="gap-3 mb-6">
					{metrics && metrics.unreadMessages > 0 && (
						<TimelineCard
							borderColor="#ffca28"
							iconBg="#FEF3C7"
							iconColor="#F59E0B"
							icon="mail"
							title={`${metrics.unreadMessages} New Messages`}
							subtitle="You have unread messages from school"
							badge={{ text: "New", bg: "#FEF3C7", textColor: "#92400E" }}
							actionButton={{
								label: "View Inbox",
								onPress: () => navigation.getParent()?.navigate("Messages"),
							}}
						/>
					)}
					{upcomingEvents?.slice(0, 3).map((event) => (
						<TimelineCard
							key={event.id}
							borderColor="#f56e3d"
							iconBg="#fff0eb"
							iconColor="#f56e3d"
							icon="event"
							title={event.title}
							subtitle={new Date(event.startDate).toLocaleDateString("en-GB", {
								weekday: "long",
								day: "numeric",
								month: "short",
							})}
							time={new Date(event.startDate).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
							badge={
								event.category
									? { text: event.category, bg: "#EDE9FE", textColor: "#6D28D9" }
									: undefined
							}
						/>
					))}
					{metrics && metrics.paymentsTotal > 0 && (
						<TimelineCard
							borderColor="#14B8A6"
							iconBg="#CCFBF1"
							iconColor="#0D9488"
							icon="account_balance_wallet"
							title="Payment Due"
							subtitle={`£${(metrics.paymentsTotal / 100).toFixed(2)} outstanding`}
							actionButton={{
								label: "Pay Now",
								onPress: () => navigation.getParent()?.navigate("Payments"),
							}}
						/>
					)}
				</View>

				{/* Progress */}
				{firstChild && (
					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-5 mb-6">
						<Text className="text-base font-sans-bold text-foreground dark:text-white mb-4">
							Progress
						</Text>
						<View className="gap-4">
							<ProgressBar
								label="Attendance"
								value={firstChildPercentage}
								icon="check_circle"
								color="#22C55E"
							/>
							<ProgressBar label="Participation" value={85} icon="groups" color="#3B82F6" />
						</View>
					</View>
				)}

				{/* Achievements */}
				<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
					Achievements
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
					<View className="flex-row gap-4">
						<AchievementBadge icon="emoji_events" label="Star Student" bgColor="#F59E0B" />
						<AchievementBadge icon="groups" label="Team Player" bgColor="#3B82F6" />
						<AchievementBadge icon="auto_stories" label="Bookworm" bgColor="#8B5CF6" />
						<AchievementBadge icon="music_note" label="Musician" bgColor="#EC4899" />
					</View>
				</ScrollView>
			</ScrollView>
		</View>
	);
}
