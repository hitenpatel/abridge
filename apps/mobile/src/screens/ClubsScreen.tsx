import { MaterialIcons } from "@expo/vector-icons";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface Club {
	id: string;
	name: string;
	day: string;
	startTime: string;
	endTime: string;
	capacity: number;
	feeInPence: number;
	enrollmentCount: number;
	isEnrolled: boolean;
}

function formatFee(pence: number): string {
	return `£${(pence / 100).toFixed(2)}`;
}

function formatDay(day: string): string {
	return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

export function ClubsScreen() {
	const insets = useSafeAreaInsets();

	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId ?? "";

	const {
		data: clubs,
		isLoading,
		isError,
		refetch,
		isRefetching,
	} = trpc.clubBooking.listClubs.useQuery({ schoolId }, { enabled: !!schoolId });

	const utils = trpc.useUtils();

	const enrollMutation = trpc.clubBooking.enroll.useMutation({
		onSuccess: () => {
			Alert.alert("Enrolled", "You have been enrolled in this club.");
			utils.clubBooking.listClubs.invalidate({ schoolId });
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const unenrollMutation = trpc.clubBooking.unenroll.useMutation({
		onSuccess: () => {
			Alert.alert("Unenrolled", "You have been removed from this club.");
			utils.clubBooking.listClubs.invalidate({ schoolId });
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const handleEnroll = (clubId: string, clubName: string) => {
		Alert.alert("Enroll", `Enroll in ${clubName}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Enroll",
				onPress: () => enrollMutation.mutate({ schoolId, clubId }),
			},
		]);
	};

	const handleUnenroll = (clubId: string, clubName: string) => {
		Alert.alert("Remove Enrollment", `Remove enrollment from ${clubName}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: () => unenrollMutation.mutate({ schoolId, clubId }),
			},
		]);
	};

	const enrolledClubs = (clubs as Club[] | undefined)?.filter((c) => c.isEnrolled) ?? [];
	const availableClubs = (clubs as Club[] | undefined)?.filter((c) => !c.isEnrolled) ?? [];

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="px-6" style={{ paddingTop: insets.top + 8 }}>
					<Skeleton className="h-10 w-40 mb-2 rounded-2xl" />
					<Skeleton className="h-5 w-48 mb-6 rounded-xl" />
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
					Failed to load clubs
				</Text>
				<Pressable onPress={() => refetch()} className="bg-primary px-6 py-3 rounded-full">
					<Text className="text-white font-sans-bold">Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				testID="clubs-screen"
				className="flex-1"
				contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f56e3d" />
				}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
						Clubs
					</Text>
					<Text className="text-sm font-sans text-text-muted mt-1">
						Browse and enroll in after-school clubs
					</Text>
				</View>

				{/* My Clubs */}
				{enrolledClubs.length > 0 && (
					<View className="px-6 mb-6">
						<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
							My Clubs
						</Text>
						<View className="gap-3">
							{enrolledClubs.map((club) => (
								<ClubCard
									key={club.id}
									club={club}
									enrolled
									onAction={() => handleUnenroll(club.id, club.name)}
									isPending={unenrollMutation.isPending}
								/>
							))}
						</View>
					</View>
				)}

				{/* Available Clubs */}
				<View className="px-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Available Clubs
					</Text>

					{availableClubs.length === 0 ? (
						<View className="items-center py-16">
							<MaterialIcons name="sports-soccer" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No clubs available
							</Text>
							<Text className="text-text-muted font-sans text-sm mt-1">
								Check back later for new clubs
							</Text>
						</View>
					) : (
						<View className="gap-3">
							{availableClubs.map((club) => (
								<ClubCard
									key={club.id}
									club={club}
									enrolled={false}
									onAction={() => handleEnroll(club.id, club.name)}
									isPending={enrollMutation.isPending}
								/>
							))}
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}

interface ClubCardProps {
	club: Club;
	enrolled: boolean;
	onAction: () => void;
	isPending: boolean;
}

function ClubCard({ club, enrolled, onAction, isPending }: ClubCardProps) {
	const spotsLeft = club.capacity - club.enrollmentCount;
	const isFull = spotsLeft <= 0;

	return (
		<View
			className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
			style={{
				borderLeftWidth: 4,
				borderLeftColor: enrolled ? "#16A34A" : "#f56e3d",
				shadowColor: "#f56e3d",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.08,
				shadowRadius: 24,
				elevation: 4,
			}}
		>
			{/* Top row: name + badge */}
			<View className="flex-row items-start justify-between mb-3">
				<View className="flex-1 mr-3">
					<Text className="text-base font-sans-bold text-foreground dark:text-white">
						{club.name}
					</Text>
					<View className="flex-row items-center gap-3 mt-1">
						<View className="flex-row items-center gap-1">
							<MaterialIcons name="event" size={14} color="#96867f" />
							<Text className="text-xs font-sans text-text-muted">{formatDay(club.day)}</Text>
						</View>
						<View className="flex-row items-center gap-1">
							<MaterialIcons name="schedule" size={14} color="#96867f" />
							<Text className="text-xs font-sans text-text-muted">
								{club.startTime}–{club.endTime}
							</Text>
						</View>
					</View>
				</View>

				{enrolled && (
					<View className="bg-green-100 rounded-full px-2.5 py-1">
						<Text className="text-xs font-sans-semibold text-green-700">Enrolled</Text>
					</View>
				)}
			</View>

			{/* Bottom row: capacity, fee, action button */}
			<View className="flex-row items-center justify-between">
				<View className="flex-row items-center gap-3">
					{/* Capacity */}
					<View className="flex-row items-center gap-1">
						<MaterialIcons name="people" size={14} color="#96867f" />
						<Text className="text-xs font-sans text-text-muted">
							{isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
						</Text>
					</View>

					{/* Fee */}
					{club.feeInPence > 0 && (
						<View className="bg-primary/10 rounded-full px-2.5 py-0.5">
							<Text className="text-xs font-sans-semibold text-primary">
								{formatFee(club.feeInPence)}
							</Text>
						</View>
					)}
				</View>

				{/* Action button */}
				{enrolled ? (
					<Pressable
						onPress={onAction}
						disabled={isPending}
						accessibilityLabel="Unenroll"
						className="bg-red-50 rounded-full px-4 py-2.5 min-h-[40px] items-center justify-center"
					>
						<Text className="text-red-600 font-sans-bold text-sm">
							{isPending ? "Removing..." : "Unenroll"}
						</Text>
					</Pressable>
				) : (
					<Pressable
						onPress={onAction}
						disabled={isPending || isFull}
						accessibilityLabel="Enroll"
						className="bg-primary rounded-full px-4 py-2.5 min-h-[40px] items-center justify-center"
						style={{ opacity: isFull ? 0.4 : 1 }}
					>
						<Text className="text-white font-sans-bold text-sm">
							{isPending ? "Enrolling..." : "Enroll"}
						</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}
