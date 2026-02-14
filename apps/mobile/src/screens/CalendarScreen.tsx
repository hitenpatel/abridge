import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

function getCategoryColor(category: string): { bg: string; text: string } {
	switch (category) {
		case "TERM_DATE":
			return { bg: "#DBEAFE", text: "#2563EB" };
		case "INSET_DAY":
			return { bg: "#FEF3C7", text: "#92400E" };
		case "EVENT":
			return { bg: "#DCFCE7", text: "#16A34A" };
		case "DEADLINE":
			return { bg: "#FEE2E2", text: "#DC2626" };
		case "CLUB":
			return { bg: "#EDE9FE", text: "#6D28D9" };
		default:
			return { bg: "#F3F4F6", text: "#6B7280" };
	}
}

export function CalendarScreen() {
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
	} = trpc.calendar.listEvents.useQuery({ startDate, endDate });

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	const handlePreviousMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
	};

	const handleNextMonth = () => {
		setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
	};

	const formattedMonth = currentDate.toLocaleString("default", {
		month: "long",
		year: "numeric",
	});

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6">
					<Skeleton className="h-12 mb-4 rounded-2xl" />
					<Skeleton className="h-24 mb-3 rounded-2xl" />
					<Skeleton className="h-24 mb-3 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-6">
				<MaterialIcons name="error-outline" size={48} color="#F87171" />
				<Text className="text-foreground font-sans-bold text-lg mt-4 mb-2">
					Failed to load events
				</Text>
				<Pressable onPress={() => refetch()} className="bg-primary px-6 py-3 rounded-full">
					<Text className="text-white font-sans-bold">Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			refreshControl={
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
			}
		>
			{/* Month Navigation */}
			<View className="flex-row items-center justify-between px-6 py-4">
				<Pressable
					onPress={handlePreviousMonth}
					className="w-10 h-10 rounded-full bg-neutral-surface dark:bg-surface-dark items-center justify-center"
				>
					<MaterialIcons name="chevron-left" size={24} color="#5c4d47" />
				</Pressable>
				<Text className="text-lg font-sans-bold text-foreground dark:text-white">
					{formattedMonth}
				</Text>
				<Pressable
					onPress={handleNextMonth}
					className="w-10 h-10 rounded-full bg-neutral-surface dark:bg-surface-dark items-center justify-center"
				>
					<MaterialIcons name="chevron-right" size={24} color="#5c4d47" />
				</Pressable>
			</View>

			{/* Events */}
			<View className="px-6 pb-8">
				{!events || events.length === 0 ? (
					<View className="items-center py-20">
						<MaterialIcons name="event" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">No events found</Text>
						<Text className="text-text-muted font-sans text-sm mt-1">
							No events scheduled for this month
						</Text>
					</View>
				) : (
					<View className="gap-3">
						{events.map((event) => {
							const eventDate = new Date(event.startDate);
							const categoryColor = getCategoryColor(event.category);

							return (
								<View
									key={event.id}
									className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row gap-3"
									style={{
										borderLeftWidth: 4,
										borderLeftColor: categoryColor.text,
										shadowColor: "#f56e3d",
										shadowOffset: { width: 0, height: 8 },
										shadowOpacity: 0.08,
										shadowRadius: 24,
										elevation: 4,
									}}
								>
									{/* Date badge */}
									<View className="bg-primary/10 rounded-xl items-center justify-center w-14 py-2">
										<Text className="text-lg font-sans-bold text-primary">
											{eventDate.getDate()}
										</Text>
										<Text className="text-xs font-sans-semibold text-primary uppercase">
											{eventDate.toLocaleString("default", { month: "short" })}
										</Text>
									</View>

									{/* Content */}
									<View className="flex-1">
										<Text className="text-base font-sans-bold text-foreground dark:text-white mb-1">
											{event.title}
										</Text>

										<View className="flex-row items-center gap-3 mb-1.5">
											{!event.allDay && (
												<View className="flex-row items-center gap-1">
													<MaterialIcons name="schedule" size={14} color="#96867f" />
													<Text className="text-xs font-sans text-text-muted">
														{eventDate.toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
														})}
													</Text>
												</View>
											)}
											<View
												className="rounded-full px-2.5 py-0.5"
												style={{ backgroundColor: categoryColor.bg }}
											>
												<Text
													className="text-xs font-sans-semibold"
													style={{ color: categoryColor.text }}
												>
													{event.category.replace("_", " ")}
												</Text>
											</View>
										</View>

										{event.body ? (
											<Text
												className="text-sm font-sans text-text-muted leading-5"
												numberOfLines={2}
											>
												{event.body}
											</Text>
										) : null}
									</View>
								</View>
							);
						})}
					</View>
				)}
			</View>
		</ScrollView>
	);
}
