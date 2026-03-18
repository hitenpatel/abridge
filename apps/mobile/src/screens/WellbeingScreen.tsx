import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Props = NativeStackScreenProps<RootStackParamList, "Wellbeing">;

type Mood = "GREAT" | "GOOD" | "OK" | "LOW" | "STRUGGLING";

const MOODS: {
	value: Mood;
	emoji: string;
	label: string;
	bg: string;
	activeBg: string;
	text: string;
}[] = [
	{
		value: "GREAT",
		emoji: "😄",
		label: "Great",
		bg: "bg-green-50",
		activeBg: "bg-green-100",
		text: "text-green-800",
	},
	{
		value: "GOOD",
		emoji: "🙂",
		label: "Good",
		bg: "bg-emerald-50",
		activeBg: "bg-emerald-100",
		text: "text-emerald-800",
	},
	{
		value: "OK",
		emoji: "😐",
		label: "OK",
		bg: "bg-yellow-50",
		activeBg: "bg-yellow-100",
		text: "text-yellow-800",
	},
	{
		value: "LOW",
		emoji: "😟",
		label: "Low",
		bg: "bg-orange-50",
		activeBg: "bg-orange-100",
		text: "text-orange-800",
	},
	{
		value: "STRUGGLING",
		emoji: "😢",
		label: "Struggling",
		bg: "bg-red-50",
		activeBg: "bg-red-100",
		text: "text-red-800",
	},
];

function getMoodConfig(mood: string) {
	return MOODS.find((m) => m.value === mood) ?? MOODS[2]!;
}

export function WellbeingScreen({ route }: Props) {
	const { childId } = route.params;
	const insets = useSafeAreaInsets();
	const utils = trpc.useUtils();
	const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
	const [note, setNote] = useState("");

	const [today] = useState(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	});
	const [thirtyDaysAgo] = useState(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() - 30);
		return d;
	});
	const [endDate] = useState(() => {
		const d = new Date();
		d.setHours(23, 59, 59, 999);
		return d;
	});

	const {
		data: checkIns,
		isLoading,
		refetch,
		isRefetching,
	} = trpc.wellbeing.getCheckIns.useQuery({
		childId,
		startDate: thirtyDaysAgo,
		endDate,
	});

	const submitMutation = trpc.wellbeing.submitCheckIn.useMutation({
		onSuccess: () => {
			Alert.alert("Saved!", "Check-in recorded successfully.");
			setSelectedMood(null);
			setNote("");
			utils.wellbeing.getCheckIns.invalidate();
		},
		onError: (err) => Alert.alert("Error", err.message),
	});

	const onRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	const handleSubmit = () => {
		if (!selectedMood) return;
		submitMutation.mutate({ childId, mood: selectedMood, note: note || undefined });
	};

	// Check if already checked in today
	const todayStr = today.toISOString().split("T")[0];
	const todayCheckIn = checkIns?.find(
		(c) => new Date(c.date).toISOString().split("T")[0] === todayStr,
	);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background px-6 pt-6">
				<Skeleton className="h-6 w-48 mb-4" />
				<View className="flex-row gap-3 mb-6">
					{MOODS.map((m) => (
						<Skeleton key={m.value} className="h-20 flex-1 rounded-2xl" />
					))}
				</View>
				<Skeleton className="h-12 w-full rounded-2xl mb-6" />
				<Skeleton className="h-48 w-full rounded-2xl" />
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
			showsVerticalScrollIndicator={false}
			refreshControl={
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
			}
		>
			{/* Mood Picker */}
			<View className="px-6 pt-6">
				<Text className="text-lg font-sans-bold text-foreground dark:text-white mb-4">
					How are they feeling today?
				</Text>
				<View className="flex-row gap-2">
					{MOODS.map((mood) => {
						const isSelected = selectedMood === mood.value;
						return (
							<Pressable
								key={mood.value}
								onPress={() => setSelectedMood(mood.value)}
								accessibilityLabel={mood.label}
								className={`flex-1 items-center py-3 rounded-2xl border-2 ${
									isSelected ? `${mood.activeBg} border-current` : `${mood.bg} border-transparent`
								}`}
								style={isSelected ? { borderColor: "#f56e3d" } : undefined}
							>
								<Text className="text-2xl mb-1">{mood.emoji}</Text>
								<Text
									className={`text-xs font-sans-semibold ${isSelected ? mood.text : "text-text-muted"}`}
								>
									{mood.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			{/* Note Input */}
			<View className="px-6 mt-4">
				<TextInput
					placeholder="Add a note (optional)"
					placeholderTextColor="#96867f"
					value={note}
					onChangeText={setNote}
					maxLength={200}
					multiline
					className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 py-3 text-foreground dark:text-white font-sans text-base min-h-[80px]"
					style={{ textAlignVertical: "top" }}
				/>
				<Text className="text-xs text-text-muted font-sans mt-1 text-right">{note.length}/200</Text>
			</View>

			{/* Submit Button */}
			<View className="px-6 mt-2">
				<Pressable
					onPress={handleSubmit}
					disabled={!selectedMood || submitMutation.isPending}
					testID="submit-checkin"
					accessibilityLabel={todayCheckIn ? "Update Check-in" : "Save Check-in"}
					className={`rounded-2xl py-4 items-center ${
						selectedMood ? "bg-primary" : "bg-neutral-surface"
					}`}
				>
					<Text
						className={`font-sans-bold text-base ${
							selectedMood ? "text-white" : "text-text-muted"
						}`}
					>
						{submitMutation.isPending
							? "Saving..."
							: todayCheckIn
								? "Update Check-in"
								: "Save Check-in"}
					</Text>
				</Pressable>
			</View>

			{/* Dev-only test button */}
			{(__DEV__ || process.env.EXPO_PUBLIC_E2E) && (
				<View className="px-6 mt-2">
					<Pressable
						onPress={() => {
							setSelectedMood("GOOD");
							setNote("Feeling happy today");
						}}
						className="bg-neutral-surface rounded-full py-2 items-center"
					>
						<Text className="text-text-muted font-sans-semibold text-sm">Test Fill</Text>
					</Pressable>
				</View>
			)}

			{/* History */}
			<View className="px-6 mt-8">
				<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
					Recent Check-ins
				</Text>
				{checkIns && checkIns.length > 0 ? (
					checkIns.map((checkIn) => {
						const config = getMoodConfig(checkIn.mood);
						const date = new Date(checkIn.date);
						const dateLabel = date.toLocaleDateString("en-GB", {
							weekday: "short",
							day: "numeric",
							month: "short",
						});
						return (
							<View
								key={checkIn.id}
								className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row items-center gap-3"
							>
								<Text className="text-xl">{config.emoji}</Text>
								<View className="flex-1">
									<View className="flex-row items-center gap-2">
										<View className={`${config.activeBg} rounded-full px-2 py-0.5`}>
											<Text className={`text-xs font-sans-bold ${config.text}`}>
												{config.label}
											</Text>
										</View>
										<Text className="text-xs font-sans text-text-muted">{dateLabel}</Text>
									</View>
									{checkIn.note && (
										<Text className="text-sm font-sans text-foreground dark:text-white mt-1">
											{checkIn.note}
										</Text>
									)}
								</View>
							</View>
						);
					})
				) : (
					<View className="items-center py-12">
						<MaterialIcons name="favorite-border" size={40} color="#D1D5DB" />
						<Text className="text-text-muted font-sans-medium text-sm mt-3">No check-ins yet</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);
}
