import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AlertCircle, Calendar, Clock, CreditCard, Mail, TrendingUp } from "lucide-react-native";
import React from "react";
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import type { RootStackParamList, TabParamList } from "../../App";
import { theme } from "../lib/theme";
import { trpc } from "../lib/trpc";

interface DashboardScreenProps {
	navigation: CompositeNavigationProp<
		BottomTabNavigationProp<TabParamList, "Dashboard">,
		NativeStackNavigationProp<RootStackParamList>
	>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
	const { data, isLoading, isError, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	if (isError || !data) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>Failed to load dashboard</Text>
				<TouchableOpacity
					onPress={() => refetch()}
					style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
				>
					<Text style={styles.retryText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const { children, metrics, todayAttendance, upcomingEvents, attendancePercentage } = data;

	return (
		<ScrollView
			style={styles.container}
			refreshControl={
				<RefreshControl
					refreshing={isRefetching}
					onRefresh={onRefresh}
					tintColor={theme.colors.primary}
				/>
			}
		>
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Overview</Text>
				<View style={styles.statsGrid}>
					<TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("Messages")}>
						<View style={[styles.iconBox, { backgroundColor: theme.colors.brandLight }]}>
							<Mail size={24} color={theme.colors.primary} />
						</View>
						<Text style={styles.statValue}>{metrics.unreadMessages}</Text>
						<Text style={styles.statLabel}>Unread Messages</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("Payments")}>
						<View style={[styles.iconBox, { backgroundColor: theme.colors.brandLight }]}>
							<CreditCard size={24} color={theme.colors.primary} />
						</View>
						<Text style={styles.statValue}>
							{(metrics.paymentsTotal / 100).toLocaleString("en-GB", {
								style: "currency",
								currency: "GBP",
							})}
						</Text>
						<Text style={styles.statLabel}>Outstanding</Text>
					</TouchableOpacity>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>My Children</Text>
				{children.length === 0 ? (
					<Text style={styles.emptyText}>No children linked.</Text>
				) : (
					children.map((child) => {
						const attendance = todayAttendance
							.filter((a) => a.childId === child.id)
							.sort((a, b) => (a.session === "AM" ? -1 : 1));

						const percentage =
							attendancePercentage.find((p) => p.childId === child.id)?.percentage ?? 0;

						return (
							<View key={child.id} style={styles.childCard}>
								<View style={styles.childHeader}>
									<Text style={styles.childName}>
										{child.firstName} {child.lastName}
									</Text>
									<View style={styles.percentageBadge}>
										<TrendingUp
											size={14}
											color={theme.colors.presentText}
											style={{ marginRight: 4 }}
										/>
										<Text style={styles.percentageText}>{percentage}% Attendance</Text>
									</View>
								</View>

								<View style={styles.attendanceRow}>
									{attendance.length > 0 ? (
										attendance.map((record) => (
											<View
												key={`${record.childId}-${record.session}`}
												style={styles.attendanceBadge}
											>
												<Text style={styles.attendanceSession}>{record.session}</Text>
												<Text
													style={[
														styles.attendanceMark,
														record.mark === "PRESENT"
															? styles.textGreen
															: record.mark === "LATE"
																? styles.textYellow
																: styles.textRed,
													]}
												>
													{record.mark}
												</Text>
											</View>
										))
									) : (
										<Text style={styles.noAttendanceText}>No attendance recorded today</Text>
									)}
								</View>
							</View>
						);
					})
				)}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Upcoming Events</Text>
				{upcomingEvents.length === 0 ? (
					<Text style={styles.emptyText}>No upcoming events this week.</Text>
				) : (
					upcomingEvents.map((event) => (
						<View key={event.id} style={styles.eventCard}>
							<View style={styles.eventDateBox}>
								<Text style={styles.eventDay}>{new Date(event.startDate).getDate()}</Text>
								<Text style={styles.eventMonth}>
									{new Date(event.startDate).toLocaleString("default", { month: "short" })}
								</Text>
							</View>
							<View style={styles.eventDetails}>
								<Text style={styles.eventTitle}>{event.title}</Text>
								<View style={styles.eventTimeRow}>
									<Clock size={14} color={theme.colors.textMuted} />
									<Text style={styles.eventTime}>
										{new Date(event.startDate).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</Text>
								</View>
								{event.category && (
									<View style={styles.categoryBadge}>
										<Text style={styles.categoryText}>{event.category}</Text>
									</View>
								)}
							</View>
						</View>
					))
				)}
			</View>

			<View style={{ height: 20 }} />
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	errorText: {
		fontSize: 16,
		color: theme.colors.error,
		marginBottom: 12,
	},
	retryButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		backgroundColor: theme.colors.primary,
		borderRadius: 6,
	},
	retryText: {
		color: theme.colors.card,
		fontWeight: "600",
	},
	section: {
		padding: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: theme.colors.text,
		marginBottom: 12,
	},
	statsGrid: {
		flexDirection: "row",
		gap: 12,
	},
	statCard: {
		flex: 1,
		backgroundColor: theme.colors.card,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.colors.border,
		alignItems: "center",
	},
	iconBox: {
		padding: 10,
		borderRadius: 10,
		marginBottom: 8,
	},
	statValue: {
		fontSize: 24,
		fontWeight: "700",
		color: theme.colors.text,
	},
	statLabel: {
		fontSize: 14,
		color: theme.colors.textMuted,
		marginTop: 2,
	},
	childCard: {
		backgroundColor: theme.colors.card,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.colors.border,
		marginBottom: 12,
	},
	childHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	childName: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.text,
	},
	percentageBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: theme.colors.present,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	percentageText: {
		fontSize: 12,
		fontWeight: "600",
		color: theme.colors.presentText,
	},
	attendanceRow: {
		flexDirection: "row",
		gap: 12,
	},
	attendanceBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: theme.colors.secondary,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 6,
	},
	attendanceSession: {
		fontSize: 12,
		fontWeight: "600",
		color: theme.colors.textMuted,
	},
	attendanceMark: {
		fontSize: 12,
		fontWeight: "700",
	},
	textGreen: { color: theme.colors.presentText },
	textYellow: { color: theme.colors.lateText },
	textRed: { color: theme.colors.absentText },
	noAttendanceText: {
		fontSize: 14,
		color: theme.colors.inactiveTab,
		fontStyle: "italic",
	},
	emptyText: {
		fontSize: 14,
		color: theme.colors.textMuted,
		fontStyle: "italic",
	},
	eventCard: {
		flexDirection: "row",
		backgroundColor: theme.colors.card,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.colors.border,
		marginBottom: 8,
	},
	eventDateBox: {
		backgroundColor: theme.colors.brandLight,
		padding: 10,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		width: 50,
		marginRight: 12,
	},
	eventDay: {
		fontSize: 18,
		fontWeight: "700",
		color: theme.colors.primary,
	},
	eventMonth: {
		fontSize: 12,
		fontWeight: "600",
		color: theme.colors.primary,
		textTransform: "uppercase",
	},
	eventDetails: {
		flex: 1,
		justifyContent: "center",
	},
	eventTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: theme.colors.text,
		marginBottom: 4,
	},
	eventTimeRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginBottom: 4,
	},
	eventTime: {
		fontSize: 12,
		color: theme.colors.textMuted,
	},
	categoryBadge: {
		alignSelf: "flex-start",
		backgroundColor: theme.colors.secondary,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	categoryText: {
		fontSize: 10,
		fontWeight: "600",
		color: theme.colors.textMuted,
		textTransform: "uppercase",
	},
});
