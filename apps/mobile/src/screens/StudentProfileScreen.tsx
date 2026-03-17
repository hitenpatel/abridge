import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { AchievementBadge } from "../components/AchievementBadge";
import { ProgressBar } from "../components/ProgressBar";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Props = NativeStackScreenProps<RootStackParamList, "StudentProfile">;

export function StudentProfileScreen({ route }: Props) {
	const { childId } = route.params;
	const insets = useSafeAreaInsets();

	const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery();

	const child = summary?.children.find((c: { id: string }) => c.id === childId);
	const attendance = summary?.attendancePercentage.find(
		(a: { childId: string }) => a.childId === childId,
	);
	const nextEvent = summary?.upcomingEvents?.[0];

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6 items-center gap-4">
					<Skeleton className="w-32 h-32 rounded-full" />
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-24 w-full rounded-2xl mt-4" />
					<Skeleton className="h-32 w-full rounded-2xl" />
				</View>
			</View>
		);
	}

	if (!child) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-6">
				<MaterialIcons name="person-off" size={48} color="#9CA3AF" />
				<Text className="text-text-muted font-sans-medium text-base mt-4">Student not found</Text>
			</View>
		);
	}

	const firstName = (child as Record<string, unknown>).firstName as string;
	const lastName = (child as Record<string, unknown>).lastName as string;
	const fullName = `${firstName} ${lastName}`;
	const initials = `${firstName[0]}${lastName[0]}`;

	return (
		<ScrollView
			testID="student-profile-screen"
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
		>
			{/* Hero Avatar Section */}
			<View className="items-center pt-8 pb-6">
				<View className="relative w-32 h-32 mb-4">
					{/* Yellow glow */}
					<View
						className="absolute inset-0 rounded-full"
						style={{ backgroundColor: "#f56e3d", opacity: 0.15, transform: [{ scale: 1.15 }] }}
					/>
					{/* Avatar */}
					<View className="w-32 h-32 rounded-full bg-primary items-center justify-center border-4 border-white">
						<Text className="text-4xl font-sans-extrabold text-white">{initials}</Text>
					</View>
				</View>
				<Text className="text-3xl font-sans-bold text-foreground dark:text-white">{fullName}</Text>
				<Text className="text-sm font-sans text-text-muted mt-1">
					Student ID: {childId.slice(0, 8).toUpperCase()}
				</Text>
			</View>

			{/* Info Card */}
			<View className="mx-6 mb-6">
				<View className="rounded-2xl p-5 flex-row" style={{ backgroundColor: "#f0fdfa" }}>
					<View className="flex-1 items-center border-r border-teal-200 pr-4">
						<MaterialIcons name="school" size={20} color="#0d9488" />
						<Text className="text-xs font-sans text-text-muted mt-1">Grade</Text>
						<Text className="text-base font-sans-bold text-foreground dark:text-white">Year 5</Text>
					</View>
					<View className="flex-1 items-center pl-4">
						<MaterialIcons name="person" size={20} color="#0d9488" />
						<Text className="text-xs font-sans text-text-muted mt-1">Teacher</Text>
						<Text className="text-base font-sans-bold text-foreground dark:text-white">
							Mrs. Smith
						</Text>
					</View>
				</View>
			</View>

			{/* Achievements */}
			<View className="mb-6">
				<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted px-6 mb-3">
					Achievements
				</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
				>
					<AchievementBadge icon="star" label="Star Reader" bgColor="#FEF3C7" />
					<AchievementBadge icon="emoji-events" label="Maths Whiz" bgColor="#DBEAFE" />
					<AchievementBadge icon="palette" label="Art Star" bgColor="#EDE9FE" />
					<AchievementBadge icon="sports-soccer" label="Sports Day" bgColor="#DCFCE7" />
				</ScrollView>
			</View>

			{/* Progress */}
			<View className="mx-6 mb-6">
				<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-5">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Progress
					</Text>
					<ProgressBar
						label="Attendance"
						value={attendance?.percentage ?? 0}
						icon="check-circle"
						color="#10B981"
					/>
					<View className="h-3" />
					<ProgressBar label="Participation" value={75} icon="groups" color="#8B5CF6" />
				</View>
			</View>

			{/* Up Next */}
			{nextEvent && (
				<View className="mx-6 mb-6">
					<View
						className="rounded-2xl p-5 flex-row items-center gap-3"
						style={{ backgroundColor: "rgba(245, 110, 61, 0.08)" }}
					>
						<View className="bg-primary/20 rounded-xl items-center justify-center w-14 py-2">
							<Text className="text-lg font-sans-bold text-primary">
								{new Date(nextEvent.startDate).getDate()}
							</Text>
							<Text className="text-xs font-sans-semibold text-primary uppercase">
								{new Date(nextEvent.startDate).toLocaleString("default", { month: "short" })}
							</Text>
						</View>
						<View className="flex-1">
							<Text className="text-xs font-sans text-text-muted mb-0.5">Up Next</Text>
							<Text className="text-base font-sans-bold text-foreground dark:text-white">
								{nextEvent.title}
							</Text>
						</View>
						<MaterialIcons name="chevron-right" size={24} color="#96867f" />
					</View>
				</View>
			)}
		</ScrollView>
	);
}
