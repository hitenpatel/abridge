import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, CreditCard, Mail, TrendingUp } from "lucide-react-native";
import React from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import type { RootStackParamList, TabParamList } from "../../App";
import { Badge, Body, Button, Card, H1, H2, Muted, Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface DashboardScreenProps {
	navigation: CompositeNavigationProp<
		BottomTabNavigationProp<TabParamList, "Dashboard">,
		NativeStackNavigationProp<RootStackParamList>
	>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
	const { data, isLoading, isError, error, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();

	console.log("Dashboard query state: isLoading=" + isLoading + " isError=" + isError + " error=" + error?.message + " dataKeys=" + (data ? Object.keys(data).join(",") : "null") + " dataStr=" + JSON.stringify(data)?.slice(0, 300));

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	if (isLoading) {
		return (
			<ScrollView className="flex-1 bg-background">
				<View className="p-4">
					<H2 className="mb-3">Overview</H2>
					<View className="flex-row gap-3 mb-6">
						<Skeleton className="flex-1 h-32" />
						<Skeleton className="flex-1 h-32" />
					</View>
					<H2 className="mb-3">My Children</H2>
					<Skeleton className="h-24 mb-3" />
					<Skeleton className="h-24 mb-3" />
				</View>
			</ScrollView>
		);
	}

	if (isError || !data) {
		return (
			<View className="flex-1 bg-background justify-center items-center px-5">
				<Body className="text-destructive mb-3">Failed to load dashboard</Body>
				<Button onPress={() => refetch()}>Retry</Button>
			</View>
		);
	}

	const { children, metrics, todayAttendance, upcomingEvents, attendancePercentage } = data ?? {};

	if (!metrics) {
		return (
			<View className="flex-1 bg-background justify-center items-center px-5">
				<Body className="text-destructive mb-3">Failed to load dashboard</Body>
				<Button onPress={() => refetch()}>Retry</Button>
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			refreshControl={
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FF7D45" />
			}
		>
			<View className="p-4">
				<H2 className="mb-3">Overview</H2>
				<View className="flex-row gap-3">
					<Pressable className="flex-1" onPress={() => navigation.navigate("Messages")}>
						<Card className="items-center active:opacity-70">
							<View className="bg-primary/10 p-2.5 rounded-lg mb-2">
								<Mail size={24} color="#FF7D45" />
							</View>
							<H1 className="text-2xl">{metrics.unreadMessages}</H1>
							<Muted className="mt-0.5 text-center">Unread Messages</Muted>
						</Card>
					</Pressable>

					<Pressable className="flex-1" onPress={() => navigation.navigate("Payments")}>
						<Card className="items-center active:opacity-70">
							<View className="bg-primary/10 p-2.5 rounded-lg mb-2">
								<CreditCard size={24} color="#FF7D45" />
							</View>
							<H1 className="text-2xl">
								{(metrics.paymentsTotal / 100).toLocaleString("en-GB", {
									style: "currency",
									currency: "GBP",
								})}
							</H1>
							<Muted className="mt-0.5 text-center">Outstanding</Muted>
						</Card>
					</Pressable>
				</View>
			</View>

			<View className="p-4">
				<H2 className="mb-3">My Children</H2>
				{children.length === 0 ? (
					<Muted className="italic">No children linked.</Muted>
				) : (
					children.map((child) => {
						const attendance = todayAttendance
							.filter((a) => a.childId === child.id)
							.sort((a, b) => (a.session === "AM" ? -1 : 1));

						const percentage =
							attendancePercentage.find((p) => p.childId === child.id)?.percentage ?? 0;

						return (
							<Card key={child.id} className="mb-3">
								<View className="flex-row justify-between items-center mb-3">
									<Body className="font-semibold">
										{child.firstName} {child.lastName}
									</Body>
									<View className="flex-row items-center bg-present rounded-full px-2 py-1">
										<TrendingUp size={14} color="#16A34A" className="mr-1" />
										<Body className="text-xs font-semibold text-present-text">
											{percentage}% Attendance
										</Body>
									</View>
								</View>

								<View className="flex-row gap-3">
									{attendance.length > 0 ? (
										attendance.map((record) => (
											<View
												key={`${record.childId}-${record.session}`}
												className="flex-row items-center bg-secondary rounded-md px-2 py-1 gap-1.5"
											>
												<Muted className="text-xs font-semibold">{record.session}</Muted>
												<Body
													className={`text-xs font-bold ${
														record.mark === "PRESENT"
															? "text-present-text"
															: record.mark === "LATE"
																? "text-late-text"
																: "text-absent-text"
													}`}
												>
													{record.mark}
												</Body>
											</View>
										))
									) : (
										<Muted className="text-sm italic">No attendance recorded today</Muted>
									)}
								</View>
							</Card>
						);
					})
				)}
			</View>

			<View className="p-4">
				<H2 className="mb-3">Upcoming Events</H2>
				{upcomingEvents.length === 0 ? (
					<Muted className="italic">No upcoming events this week.</Muted>
				) : (
					upcomingEvents.map((event) => (
						<Card key={event.id} className="flex-row mb-2 p-3">
							<View className="bg-primary/10 p-2.5 rounded-lg items-center justify-center w-12 mr-3">
								<Body className="text-lg font-bold text-primary">
									{new Date(event.startDate).getDate()}
								</Body>
								<Body className="text-xs font-semibold text-primary uppercase">
									{new Date(event.startDate).toLocaleString("default", { month: "short" })}
								</Body>
							</View>
							<View className="flex-1 justify-center">
								<Body className="font-semibold mb-1">{event.title}</Body>
								<View className="flex-row items-center gap-1 mb-1">
									<Clock size={14} color="#9CA3AF" />
									<Muted className="text-xs">
										{new Date(event.startDate).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</Muted>
								</View>
								{event.category && (
									<Badge variant="secondary" className="self-start">
										{event.category}
									</Badge>
								)}
							</View>
						</Card>
					))
				)}
			</View>

			<View className="h-5" />
		</ScrollView>
	);
};
