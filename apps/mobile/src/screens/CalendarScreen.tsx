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
import { trpc } from "../lib/trpc";

type CalendarScreenNavigationProp = CompositeNavigationProp<
	BottomTabNavigationProp<TabParamList, "Calendar">,
	NativeStackNavigationProp<RootStackParamList>
>;

interface CalendarScreenProps {
	navigation: CalendarScreenNavigationProp;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
	TERM_DATE: { bg: "#dbeafe", text: "#1e40af" }, // blue
	INSET_DAY: { bg: "#ffedd5", text: "#9a3412" }, // orange
	EVENT: { bg: "#dcfce7", text: "#166534" }, // green
	DEADLINE: { bg: "#fee2e2", text: "#991b1b" }, // red
	CLUB: { bg: "#f3e8ff", text: "#6b21a8" }, // purple
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
				<ActivityIndicator size="large" color="#1d4ed8" />
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
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1d4ed8" />
			}
		>
			<View style={styles.header}>
				<TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
					<ChevronLeft size={24} color="#374151" />
				</TouchableOpacity>
				<Text style={styles.monthTitle}>{formattedMonth}</Text>
				<TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
					<ChevronRight size={24} color="#374151" />
				</TouchableOpacity>
			</View>

			<View style={styles.eventsList}>
				{!events || events.length === 0 ? (
					<View style={styles.emptyContainer}>
						<CalendarIcon size={48} color="#9ca3af" style={styles.emptyIcon} />
						<Text style={styles.emptyText}>No events found for this month</Text>
					</View>
				) : (
					events.map((event) => {
						const eventDate = new Date(event.startDate);
						const categoryStyle = CATEGORY_STYLES[event.category] || {
							bg: "#f3f4f6",
							text: "#374151",
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
													<Clock size={14} color="#6b7280" />
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
		backgroundColor: "#f9fafb",
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
		color: "#ef4444",
		marginBottom: 12,
	},
	retryButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		backgroundColor: "#1d4ed8",
		borderRadius: 6,
	},
	retryText: {
		color: "#fff",
		fontWeight: "600",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: 16,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	monthTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#111827",
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
		color: "#6b7280",
		fontStyle: "italic",
	},
	eventCard: {
		flexDirection: "row",
		backgroundColor: "#fff",
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		marginBottom: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	eventDateBox: {
		backgroundColor: "#eff6ff",
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
		color: "#1d4ed8",
	},
	eventMonth: {
		fontSize: 12,
		fontWeight: "600",
		color: "#1d4ed8",
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
		color: "#111827",
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
		color: "#6b7280",
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
		color: "#4b5563",
		lineHeight: 20,
	},
});
