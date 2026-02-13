import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import type { RootStackParamList, TabParamList } from "../../App";
import { Badge, Body, Button, Card, EmptyState, H2, Muted, Skeleton } from "../components/ui";
import { useTheme } from "../lib/use-theme";
import { trpc } from "../lib/trpc";

type CalendarScreenNavigationProp = CompositeNavigationProp<
	BottomTabNavigationProp<TabParamList, "Calendar">,
	NativeStackNavigationProp<RootStackParamList>
>;

interface CalendarScreenProps {
	navigation: CalendarScreenNavigationProp;
}

const getCategoryVariant = (category: string): "default" | "destructive" | "warning" | "success" | "info" => {
	switch (category) {
		case "TERM_DATE":
			return "info";
		case "INSET_DAY":
			return "warning";
		case "EVENT":
			return "success";
		case "DEADLINE":
			return "destructive";
		case "CLUB":
			return "info";
		default:
			return "default";
	}
};

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
	const [currentDate, setCurrentDate] = useState(new Date());
	const { isDark } = useTheme();

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
			<View className="flex-1 bg-background">
				<View className="p-4">
					<Skeleton className="h-12 mb-4" />
					<Skeleton className="h-24 mb-3" />
					<Skeleton className="h-24 mb-3" />
					<Skeleton className="h-24" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background justify-center items-center px-5">
				<Body className="text-destructive mb-3">Failed to load events</Body>
				<Button onPress={() => refetch()}>Retry</Button>
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#FF7D45" />}
		>
			<View className="flex-row items-center justify-between p-4 bg-card border-b border-border">
				<Pressable onPress={handlePreviousMonth} className="p-2 active:opacity-70">
					<ChevronLeft size={24} color={isDark ? "#E5E7EB" : "#2D3748"} />
				</Pressable>
				<H2>{formattedMonth}</H2>
				<Pressable onPress={handleNextMonth} className="p-2 active:opacity-70">
					<ChevronRight size={24} color={isDark ? "#E5E7EB" : "#2D3748"} />
				</Pressable>
			</View>

			<View className="p-4">
				{!events || events.length === 0 ? (
					<EmptyState
						icon={<CalendarIcon size={48} color="#9CA3AF" />}
						title="No events found"
						description="No events scheduled for this month"
					/>
				) : (
					events.map((event) => {
						const eventDate = new Date(event.startDate);

						return (
							<Card key={event.id} className="flex-row mb-3 p-3">
								<View className="bg-primary/10 p-2.5 rounded-lg items-center justify-center w-12 h-15 mr-3">
									<Body className="text-lg font-bold text-primary">{eventDate.getDate()}</Body>
									<Body className="text-xs font-semibold text-primary uppercase">
										{eventDate.toLocaleString("default", { month: "short" })}
									</Body>
								</View>
								<View className="flex-1">
									<Body className="font-semibold mb-1">{event.title}</Body>

									<View className="flex-row items-center justify-between mb-1.5">
										{!event.allDay && (
											<View className="flex-row items-center gap-1">
												<Clock size={14} color="#9CA3AF" />
												<Muted className="text-xs">
													{eventDate.toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</Muted>
											</View>
										)}
										<Badge variant={getCategoryVariant(event.category)}>
											{event.category.replace("_", " ")}
										</Badge>
									</View>

									{event.body ? (
										<Muted className="text-sm leading-5" numberOfLines={2}>
											{event.body}
										</Muted>
									) : null}
								</View>
							</Card>
						);
					})
				)}
			</View>
			<View className="h-5" />
		</ScrollView>
	);
};
