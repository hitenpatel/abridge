import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
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

const BADGE_COLORS = [
	"#F59E0B",
	"#10B981",
	"#6366F1",
	"#EC4899",
	"#8B5CF6",
	"#14B8A6",
	"#F97316",
	"#3B82F6",
];

function getBadgeColor(index: number): string {
	return BADGE_COLORS[index % BADGE_COLORS.length]!;
}

export function AchievementsScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	useEffect(() => {
		if (children && children.length > 0 && !selectedChildId) {
			const firstChild = children[0];
			if (firstChild) setSelectedChildId(firstChild.id);
		}
	}, [children, selectedChildId]);

	const {
		data: achievementsData,
		isLoading: isLoadingAchievements,
		refetch: refetchAchievements,
		isRefetching: isRefetchingAchievements,
	} = trpc.achievement.getChildAchievements.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	const {
		data: recentAwards,
		isLoading: isLoadingRecent,
		refetch: refetchRecent,
		isRefetching: isRefetchingRecent,
	} = trpc.achievement.getRecentAwards.useQuery();

	const onRefresh = useCallback(() => {
		refetchAchievements();
		refetchRecent();
	}, [refetchAchievements, refetchRecent]);

	const totalPoints = achievementsData?.totalPoints ?? 0;
	const awards = achievementsData?.awards ?? [];

	// Extract unique badges (BADGE type achievements)
	const badges = awards.filter((a) => a.category?.type === "BADGE");
	const uniqueBadges = Array.from(
		new Map(badges.map((b) => [b.category?.name, b])).values(),
	);

	const selectedChild = children?.find((c) => c.id === selectedChildId);

	if (isLoadingChildren) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefetchingAchievements || isRefetchingRecent}
						onRefresh={onRefresh}
						tintColor="#f56e3d"
					/>
				}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<View className="flex-row items-center justify-between">
						<View>
							<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
								Achievements
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">
								Awards & recognition
							</Text>
						</View>
						<View className="bg-amber-100 rounded-full px-3 py-1.5">
							<MaterialIcons name="emoji-events" size={18} color="#F59E0B" />
						</View>
					</View>
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

				{/* Total Points Card */}
				<View className="mx-6 mb-6" accessibilityLabel="Total Points">
					<View
						className="bg-white dark:bg-surface-dark rounded-3xl p-6 items-center"
						style={{
							shadowColor: "#F59E0B",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.15,
							shadowRadius: 12,
							elevation: 4,
						}}
					>
						<MaterialIcons name="star" size={32} color="#F59E0B" />
						{isLoadingAchievements ? (
							<Skeleton className="h-12 w-24 mt-2 rounded-2xl" />
						) : (
							<Text
								className="text-5xl font-sans-extrabold text-foreground dark:text-white mt-2"
								testID="total-points"
								accessibilityLabel={`${totalPoints} points`}
							>
								{totalPoints.toLocaleString()}
							</Text>
						)}
						<Text className="text-sm font-sans-semibold text-text-muted mt-1">
							Total Points{selectedChild ? ` - ${selectedChild.firstName}` : ""}
						</Text>
					</View>
				</View>

				{/* Badge Wall */}
				<View className="px-6 mb-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Badges Earned
					</Text>

					{isLoadingAchievements ? (
						<View className="flex-row flex-wrap gap-3">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="w-20 h-24 rounded-2xl" />
							))}
						</View>
					) : uniqueBadges.length > 0 ? (
						<View className="flex-row flex-wrap gap-3">
							{uniqueBadges.map((badge, index) => (
								<View
									key={badge.id}
									className="w-20 items-center py-3 rounded-2xl bg-neutral-surface dark:bg-surface-dark"
								>
									<View
										className="w-10 h-10 rounded-full items-center justify-center mb-2"
										style={{ backgroundColor: `${getBadgeColor(index)}20` }}
									>
										<MaterialIcons
											name={(badge.category?.icon as keyof typeof MaterialIcons.glyphMap) || "star"}
											size={20}
											color={getBadgeColor(index)}
										/>
									</View>
									<Text
										className="text-xs font-sans-semibold text-foreground dark:text-white text-center px-1"
										numberOfLines={2}
									>
										{badge.category?.name ?? "Badge"}
									</Text>
								</View>
							))}
						</View>
					) : (
						<View className="items-center py-8">
							<MaterialIcons name="military-tech" size={40} color="#D1D5DB" />
							<Text className="text-text-muted font-sans-medium text-sm mt-3">
								No badges earned yet
							</Text>
						</View>
					)}
				</View>

				{/* Recent Awards */}
				<View className="px-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Recent Awards
					</Text>

					{isLoadingRecent ? (
						<View className="gap-3">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-20 w-full rounded-2xl" />
							))}
						</View>
					) : recentAwards && recentAwards.length > 0 ? (
						<View className="gap-3">
							{recentAwards.map((award, index) => {
								const dateLabel = new Date(award.createdAt).toLocaleDateString("en-GB", {
									weekday: "short",
									day: "numeric",
									month: "short",
								});
								const isBadge = award.category?.type === "BADGE";
								return (
									<View
										key={award.id}
										className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
									>
										<View
											className="w-10 h-10 rounded-full items-center justify-center"
											style={{ backgroundColor: `${getBadgeColor(index)}20` }}
										>
											<MaterialIcons
												name={
													isBadge
														? ((award.category?.icon as keyof typeof MaterialIcons.glyphMap) || "military-tech")
														: "star"
												}
												size={20}
												color={getBadgeColor(index)}
											/>
										</View>
										<View className="flex-1">
											<View className="flex-row items-center gap-2">
												<Text className="text-sm font-sans-bold text-foreground dark:text-white">
													{award.category?.name ?? "Award"}
												</Text>
												{award.child && (
													<Text className="text-xs font-sans text-text-muted">
														- {award.child.firstName}
													</Text>
												)}
											</View>
											{award.reason && (
												<Text
													className="text-xs font-sans text-text-muted mt-0.5"
													numberOfLines={1}
												>
													{award.reason}
												</Text>
											)}
											<View className="flex-row items-center gap-2 mt-1">
												<Text className="text-xs font-sans text-text-muted">{dateLabel}</Text>
												{award.awarder?.name && (
													<Text className="text-xs font-sans text-text-muted">
														by {award.awarder.name}
													</Text>
												)}
											</View>
										</View>
										<View className="bg-amber-100 rounded-full px-2.5 py-1">
											<Text className="text-xs font-sans-bold text-amber-700">
												+{award.points}
											</Text>
										</View>
									</View>
								);
							})}
						</View>
					) : (
						<View className="items-center py-10">
							<MaterialIcons name="emoji-events" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No awards yet
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
