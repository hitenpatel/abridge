import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

export function StaffAttendanceScreen() {
	const { data: summary, isLoading, refetch, isRefetching } = trpc.dashboard.getSummary.useQuery();

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6 gap-4">
					<Skeleton className="h-8 w-48" />
					<View className="flex-row gap-3">
						<Skeleton className="h-24 flex-1 rounded-2xl" />
						<Skeleton className="h-24 flex-1 rounded-2xl" />
					</View>
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
				</View>
			</View>
		);
	}

	const todayAttendance = summary?.todayAttendance ?? [];
	const attendancePercentage = summary?.attendancePercentage ?? [];

	const totalStudents = summary?.children?.length ?? 0;
	const presentToday = todayAttendance.filter((r: { mark: string }) => r.mark === "PRESENT").length;
	const absentToday = todayAttendance.filter((r: { mark: string }) =>
		r.mark.includes("ABSENT"),
	).length;
	const lateToday = todayAttendance.filter((r: { mark: string }) => r.mark === "LATE").length;

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 100 }}
			refreshControl={
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
			}
		>
			{/* Header */}
			<View className="px-6 pt-4 pb-2">
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Attendance</Text>
				<Text className="text-sm font-sans text-text-muted mt-0.5">
					Today's attendance overview
				</Text>
			</View>

			{/* Stats Row */}
			<View className="px-6 mt-4">
				<View className="flex-row gap-3">
					<View
						className="flex-1 bg-green-50 rounded-2xl p-4 items-center"
						accessibilityLabel="Present"
					>
						<Text className="text-2xl font-sans-bold text-green-700">{presentToday}</Text>
						<Text className="text-xs font-sans-medium text-green-600 mt-1">Present</Text>
					</View>
					<View
						className="flex-1 bg-red-50 rounded-2xl p-4 items-center"
						accessibilityLabel="Absent"
					>
						<Text className="text-2xl font-sans-bold text-red-700">{absentToday}</Text>
						<Text className="text-xs font-sans-medium text-red-600 mt-1">Absent</Text>
					</View>
					<View className="flex-1 bg-yellow-50 rounded-2xl p-4 items-center">
						<Text className="text-2xl font-sans-bold text-yellow-700">{lateToday}</Text>
						<Text className="text-xs font-sans-medium text-yellow-600 mt-1">Late</Text>
					</View>
				</View>
			</View>

			{/* Absent Students */}
			<View className="px-6 mt-6">
				<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
					Absent Today
				</Text>

				{absentToday === 0 ? (
					<View className="items-center py-12 bg-neutral-surface dark:bg-surface-dark rounded-2xl">
						<MaterialIcons name="check-circle" size={40} color="#16A34A" />
						<Text className="text-text-muted font-sans-medium text-sm mt-3">
							All students present today
						</Text>
					</View>
				) : (
					<View className="gap-3">
						{todayAttendance
							.filter((r: { mark: string }) => r.mark.includes("ABSENT"))
							.map((record: { childId: string; mark: string; session: string }, index: number) => {
								const child = summary?.children?.find(
									(c: { id: string }) => c.id === record.childId,
								) as { id: string; firstName: string; lastName: string } | undefined;

								return (
									<View
										key={`${record.childId}-${record.session}-${index}`}
										className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
										style={{ borderLeftWidth: 4, borderLeftColor: "#EF4444" }}
									>
										<View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
											<Text className="text-sm font-sans-bold text-red-600">
												{child
													? `${(child as { firstName: string }).firstName[0]}${(child as { lastName: string }).lastName[0]}`
													: "?"}
											</Text>
										</View>
										<View className="flex-1">
											<Text className="text-base font-sans-bold text-foreground dark:text-white">
												{child ? `${child.firstName} ${child.lastName}` : "Unknown"}
											</Text>
											<Text className="text-xs font-sans text-text-muted">
												{record.session} · {record.mark.replace("_", " ")}
											</Text>
										</View>
									</View>
								);
							})}
					</View>
				)}
			</View>

			{/* Attendance Rates */}
			{attendancePercentage.length > 0 && (
				<View className="px-6 mt-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						30-Day Attendance Rate
					</Text>
					<View className="gap-3">
						{attendancePercentage.map((entry: { childId: string; percentage: number }) => {
							const child = summary?.children?.find(
								(c: { id: string }) => c.id === entry.childId,
							) as { id: string; firstName: string; lastName: string } | undefined;

							const pctColor =
								entry.percentage >= 95 ? "#16A34A" : entry.percentage >= 90 ? "#F59E0B" : "#EF4444";

							return (
								<View
									key={entry.childId}
									className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
								>
									<View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
										<Text className="text-sm font-sans-bold text-primary">
											{child ? `${child.firstName[0]}${child.lastName[0]}` : "?"}
										</Text>
									</View>
									<View className="flex-1">
										<Text className="text-base font-sans-bold text-foreground dark:text-white">
											{child ? `${child.firstName} ${child.lastName}` : "Unknown"}
										</Text>
										<View className="flex-row items-center gap-2 mt-1">
											<View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
												<View
													className="h-full rounded-full"
													style={{
														width: `${entry.percentage}%`,
														backgroundColor: pctColor,
													}}
												/>
											</View>
											<Text className="text-xs font-sans-bold" style={{ color: pctColor }}>
												{entry.percentage}%
											</Text>
										</View>
									</View>
								</View>
							);
						})}
					</View>
				</View>
			)}
		</ScrollView>
	);
}
