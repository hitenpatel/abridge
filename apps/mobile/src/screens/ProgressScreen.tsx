import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChildSelector } from "../components/ChildSelector";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface Child {
	id: string;
	firstName: string;
	lastName: string;
}

interface ChildWrapper {
	child: Child;
}

interface TemplateData {
	childName?: string;
	attendance?: { percentage: number; daysPresent: number; daysTotal: number; lateCount: number };
	homework?: { completed: number; total: number; overdue: number };
	reading?: {
		daysRead: number;
		totalMinutes: number;
		avgMinutes: number;
		currentStreak: number;
		currentBook: string | null;
	};
	achievements?: { pointsEarned: number; awardsReceived: number; categories: string[] };
	wellbeing?: { avgMood: string | null; checkInCount: number; trend: string | null };
}

function getMoodEmoji(mood: string | null | undefined): string {
	switch (mood) {
		case "GREAT":
			return "😄";
		case "GOOD":
			return "🙂";
		case "OK":
			return "😐";
		case "LOW":
			return "😟";
		case "STRUGGLING":
			return "😢";
		default:
			return "—";
	}
}

function getTrendIcon(trend: string | null | undefined): { icon: string; color: string } {
	switch (trend) {
		case "improving":
			return { icon: "trending-up", color: "#16A34A" };
		case "declining":
			return { icon: "trending-down", color: "#DC2626" };
		case "stable":
			return { icon: "trending-flat", color: "#D97706" };
		default:
			return { icon: "remove", color: "#9CA3AF" };
	}
}

export function ProgressScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const {
		data: summary,
		isLoading: isLoadingSummary,
		refetch,
		isRefetching,
	} = trpc.progressSummary.getLatestSummary.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	useEffect(() => {
		if (children && children.length > 0 && !selectedChildId) {
			const firstChild = children[0];
			if (firstChild) setSelectedChildId(firstChild.id);
		}
	}, [children, selectedChildId]);

	const onRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	const templateData = summary?.templateData as TemplateData | undefined;
	const weekLabel = summary?.weekStart
		? new Date(summary.weekStart).toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: null;

	if (isLoadingChildren) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<View testID="progress-screen" className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
						Progress
					</Text>
					<Text className="text-sm font-sans text-text-muted mt-1">Weekly progress summary</Text>
				</View>

				{/* Child Selector */}
				{children && children.length > 0 && (
					<View className="px-6 mb-6">
						<ChildSelector
							items={children}
							selectedChildId={selectedChildId ?? ""}
							onSelect={setSelectedChildId}
						/>
					</View>
				)}

				{isLoadingSummary ? (
					<View className="px-6">
						<Skeleton className="h-6 w-48 mb-4" />
						<View className="flex-row flex-wrap gap-3 mb-6">
							<Skeleton className="h-24 flex-1 rounded-2xl" />
							<Skeleton className="h-24 flex-1 rounded-2xl" />
						</View>
						<Skeleton className="h-32 w-full rounded-2xl mb-4" />
						<Skeleton className="h-48 w-full rounded-2xl" />
					</View>
				) : summary ? (
					<>
						{/* Week Label */}
						{weekLabel && (
							<View className="px-6 mb-4">
								<View className="flex-row items-center gap-2">
									<MaterialIcons name="date-range" size={16} color="#96867f" />
									<Text
										className="text-sm font-sans-semibold text-text-muted"
										accessibilityLabel="Week of"
									>
										Week of {weekLabel}
									</Text>
								</View>
							</View>
						)}

						{/* Metric Mini-Cards */}
						<View className="px-6 mb-6" accessibilityLabel="Progress Metrics">
							<View className="flex-row flex-wrap gap-3">
								{/* Attendance */}
								<View
									className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 flex-1"
									style={{ minWidth: "45%" }}
									accessibilityLabel="Attendance"
								>
									<View className="flex-row items-center gap-2 mb-2">
										<MaterialIcons name="check-circle" size={18} color="#16A34A" />
										<Text className="text-xs font-sans-semibold text-green-800 dark:text-green-300">
											Attendance
										</Text>
									</View>
									<Text className="text-2xl font-sans-extrabold text-green-900 dark:text-green-200">
										{templateData?.attendance?.percentage ?? 0}%
									</Text>
									<Text className="text-xs font-sans text-green-700 dark:text-green-400">
										{templateData?.attendance?.daysPresent ?? 0}/
										{templateData?.attendance?.daysTotal ?? 0} days
									</Text>
								</View>

								{/* Homework */}
								<View
									className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex-1"
									style={{ minWidth: "45%" }}
									accessibilityLabel="Homework"
								>
									<View className="flex-row items-center gap-2 mb-2">
										<MaterialIcons name="assignment" size={18} color="#2563EB" />
										<Text className="text-xs font-sans-semibold text-blue-800 dark:text-blue-300">
											Homework
										</Text>
									</View>
									<Text className="text-2xl font-sans-extrabold text-blue-900 dark:text-blue-200">
										{templateData?.homework?.completed ?? 0}/{templateData?.homework?.total ?? 0}
									</Text>
									<Text className="text-xs font-sans text-blue-700 dark:text-blue-400">
										completed
									</Text>
								</View>

								{/* Reading Streak */}
								<View
									className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 flex-1"
									style={{ minWidth: "45%" }}
									accessibilityLabel="Reading Streak"
								>
									<View className="flex-row items-center gap-2 mb-2">
										<MaterialIcons name="menu-book" size={18} color="#7C3AED" />
										<Text className="text-xs font-sans-semibold text-purple-800 dark:text-purple-300">
											Reading
										</Text>
									</View>
									<Text className="text-2xl font-sans-extrabold text-purple-900 dark:text-purple-200">
										{templateData?.reading?.currentStreak ?? 0}
									</Text>
									<Text className="text-xs font-sans text-purple-700 dark:text-purple-400">
										day streak
									</Text>
								</View>

								{/* Achievement Points */}
								<View
									className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 flex-1"
									style={{ minWidth: "45%" }}
									accessibilityLabel="Achievement Points"
								>
									<View className="flex-row items-center gap-2 mb-2">
										<MaterialIcons name="emoji-events" size={18} color="#D97706" />
										<Text className="text-xs font-sans-semibold text-amber-800 dark:text-amber-300">
											Achievements
										</Text>
									</View>
									<Text className="text-2xl font-sans-extrabold text-amber-900 dark:text-amber-200">
										{templateData?.achievements?.pointsEarned ?? 0}
									</Text>
									<Text className="text-xs font-sans text-amber-700 dark:text-amber-400">
										points earned
									</Text>
								</View>

								{/* Wellbeing Mood */}
								<View
									className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-4"
									style={{ minWidth: "45%", flexGrow: 1 }}
									accessibilityLabel="Wellbeing"
								>
									<View className="flex-row items-center gap-2 mb-2">
										<MaterialIcons name="favorite" size={18} color="#EC4899" />
										<Text className="text-xs font-sans-semibold text-pink-800 dark:text-pink-300">
											Wellbeing
										</Text>
									</View>
									<View className="flex-row items-center gap-2">
										<Text className="text-2xl">
											{getMoodEmoji(templateData?.wellbeing?.avgMood)}
										</Text>
										{templateData?.wellbeing?.trend && (
											<MaterialIcons
												name={
													getTrendIcon(templateData.wellbeing.trend)
														.icon as keyof typeof MaterialIcons.glyphMap
												}
												size={20}
												color={getTrendIcon(templateData.wellbeing.trend).color}
											/>
										)}
									</View>
									<Text className="text-xs font-sans text-pink-700 dark:text-pink-400">
										{templateData?.wellbeing?.avgMood
											? templateData.wellbeing.avgMood.charAt(0) +
												templateData.wellbeing.avgMood.slice(1).toLowerCase()
											: "No check-ins"}
									</Text>
								</View>
							</View>
						</View>

						{/* AI Insight Callout */}
						{summary.insight && (
							<View className="px-6 mb-6">
								<View
									className="bg-primary/10 rounded-2xl p-4 border border-primary/20"
									accessibilityLabel="AI Insight"
								>
									<View className="flex-row items-center gap-2 mb-2">
										<MaterialIcons name="auto-awesome" size={18} color="#f56e3d" />
										<Text className="text-sm font-sans-bold text-primary">AI Insight</Text>
									</View>
									<Text className="text-sm font-sans text-foreground dark:text-white leading-5">
										{summary.insight}
									</Text>
								</View>
							</View>
						)}

						{/* Full Summary Text */}
						<View className="px-6">
							<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
								Full Summary
							</Text>
							<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-5">
								<Text
									className="text-sm font-sans text-foreground dark:text-white leading-6"
									accessibilityLabel="Summary Text"
								>
									{summary.summary}
								</Text>
							</View>
						</View>
					</>
				) : (
					<View className="items-center py-20 px-6">
						<MaterialIcons name="insights" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4 text-center">
							No progress summary available yet
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1 text-center">
							Summaries are generated weekly
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}
