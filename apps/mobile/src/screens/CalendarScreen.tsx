import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react-native";
import React, { useMemo, useState } from "react";
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

type CalendarScreenNavigationProp = CompositeNavigationProp<
	BottomTabNavigationProp<TabParamList, "Calendar">,
	NativeStackNavigationProp<RootStackParamList>
>;

interface CalendarScreenProps {
	navigation: CalendarScreenNavigationProp;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
	TERM_DATE: { bg: theme.colors.brandLight, text: theme.colors.brandDark }, // blue
	INSET_DAY: { bg: theme.colors.late, text: theme.colors.lateText }, // orange
	EVENT: { bg: theme.colors.present, text: theme.colors.presentText }, // green
	DEADLINE: { bg: theme.colors.absent, text: theme.colors.absentText }, // red
	CLUB: { bg: theme.colors.brandLight, text: theme.colors.brandDark }, // purple
};

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
	const [currentDate, setCurrentDate] = useState(new Date());

	const { startDate, endDate } = useMemo(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const start = new Date(year, month, 1);
		const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
		return { startDate: start, endDate: end };
	}, [currentDate]);

	const {
		data: events,
		isLoading,
		isError,
		refetch,
		isRefetching,
	} = trpc.calendar.listEvents.useQuery({
		startDate,
		endDate,
	});

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	const handlePreviousMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
	};

	const handleNextMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
	};

	const formattedMonth = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	if (isError) {
		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>Failed to load events</Text>
				<TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
					<Text style={styles.retryText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

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
			<View style={styles.header}>
				<TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
					<ChevronLeft size={24} color={theme.colors.text} />
				</TouchableOpacity>
				<Text style={styles.monthTitle}>{formattedMonth}</Text>
				<TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
					<ChevronRight size={24} color={theme.colors.text} />
				</TouchableOpacity>
			</View>

			<View style={styles.eventsList}>
				{!events || events.length === 0 ? (
					<View style={styles.emptyContainer}>
						<CalendarIcon size={48} color={theme.colors.inactiveTab} style={styles.emptyIcon} />
						<Text style={styles.emptyText}>No events found for this month</Text>
					</View>
				) : (
					events.map((event) => {
						const eventDate = new Date(event.startDate);
						const categoryStyle = CATEGORY_STYLES[event.category] || {
							bg: theme.colors.secondary,
							text: theme.colors.text,
						};

						return (
							<View key={event.id} style={styles.eventCard}>
								<View style={styles.eventDateBox}>
									<Text style={styles.eventDay}>{eventDate.getDate()}</Text>
									<Text style={styles.eventMonth}>
										{eventDate.toLocaleString("default", { month: "short" })}
									</Text>
								</View>
								<View style={styles.eventDetails}>
									<View style={styles.eventHeader}>
										<Text style={styles.eventTitle}>{event.title}</Text>
									</View>

									<View style={styles.eventMeta}>
										<View style={styles.eventTimeRow}>
											{!event.allDay && (
												<>
													<Clock size={14} color={theme.colors.textMuted} />
													<Text style={styles.eventTime}>
														{eventDate.toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
														})}
													</Text>
												</>
											)}
										</View>

										<View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
											<Text style={[styles.categoryText, { color: categoryStyle.text }]}>
												{event.category.replace("_", " ")}
											</Text>
										</View>
									</View>

									{event.body ? (
										<Text style={styles.eventBody} numberOfLines={2}>
											{event.body}
										</Text>
									) : null}
								</View>
							</View>
						);
					})
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
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		backgroundColor: theme.colors.card,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	monthTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: theme.colors.text,
	},
	navButton: {
		padding: 8,
	},
	eventsList: {
		padding: 16,
	},
	emptyContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 40,
	},
	emptyIcon: {
		marginBottom: 12,
	},
	emptyText: {
		fontSize: 16,
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
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	eventDateBox: {
		backgroundColor: theme.colors.brandLight,
		padding: 10,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		width: 50,
		marginRight: 12,
		height: 60,
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
		justifyContent: "flex-start",
	},
	eventHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 4,
	},
	eventTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.text,
		flex: 1,
	},
	eventMeta: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
	},
	eventTimeRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	eventTime: {
		fontSize: 12,
		color: theme.colors.textMuted,
	},
	categoryBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	categoryText: {
		fontSize: 10,
		fontWeight: "700",
		textTransform: "uppercase",
	},
	eventBody: {
		fontSize: 14,
		color: theme.colors.textMuted,
		lineHeight: 20,
	},
});
